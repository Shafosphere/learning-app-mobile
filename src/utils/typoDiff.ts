export type DiffType = "substitution" | "insertion" | "deletion";

export interface TypoDiff {
    type: DiffType;
    index: number;
    expectedChar: string; // The char that should be there (or empty for insertion)
    inputChar: string;   // The char that was typed (or empty for deletion)
}

/**
 * Calculates the difference between two strings assuming an edit distance of 1.
 * Useful for highlighting typos.
 */
export function calculateTypoDiff(input: string, expected: string): TypoDiff | null {
    if (input === expected) return null;

    const len1 = input.length;
    const len2 = expected.length;

    // Optimistic check for substitution (same length)
    if (len1 === len2) {
        let diffIndex = -1;
        for (let i = 0; i < len1; i++) {
            if (input[i] !== expected[i]) {
                if (diffIndex !== -1) return null; // More than 1 diff
                diffIndex = i;
            }
        }
        if (diffIndex !== -1) {
            return {
                type: "substitution",
                index: diffIndex,
                inputChar: input[diffIndex],
                expectedChar: expected[diffIndex],
            };
        }
    }

    // Check for insertion (input is longer by 1)
    if (len1 === len2 + 1) {
        for (let i = 0; i < len2; i++) {
            if (input[i] !== expected[i]) {
                // mismatch at i. If the rest matches shifted, it's an insertion at i.
                if (input.slice(i + 1) === expected.slice(i)) {
                    return {
                        type: "insertion",
                        index: i,
                        inputChar: input[i],
                        expectedChar: "",
                    };
                }
                return null;
            }
        }
        // If loop finishes, it's the last char
        return {
            type: "insertion",
            index: len2,
            inputChar: input[len2],
            expectedChar: "",
        };
    }

    // Check for deletion (input is shorter by 1)
    if (len1 === len2 - 1) {
        for (let i = 0; i < len1; i++) {
            if (input[i] !== expected[i]) {
                // mismatch at i. If rest matches shifted, it's a deletion at i.
                if (input.slice(i) === expected.slice(i + 1)) {
                    return {
                        type: "deletion",
                        index: i,
                        inputChar: "",
                        expectedChar: expected[i],
                    };
                }
                return null;
            }
        }
        // If loop finishes, it's the last char
        return {
            type: "deletion",
            index: len1,
            inputChar: "",
            expectedChar: expected[len1],
        };
    }

    return null;
}
