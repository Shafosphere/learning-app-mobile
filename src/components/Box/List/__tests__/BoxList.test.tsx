/* eslint-disable @typescript-eslint/no-require-imports */
import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import React from "react";
import * as ReactNative from "react-native";
import { ScrollView, Text, View } from "react-native";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import BoxSkin from "../../Skin/BoxSkin";
import BoxList, {
    getClassicBoxLayout,
} from "../BoxList";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (_key: string, values?: Record<string, unknown>) =>
            `box ${values?.box} count ${values?.count}`,
    }),
}));

jest.mock("@edwardloopez/react-native-coachmark", () => ({
    CoachmarkAnchor: ({
        children,
        id,
        style,
    }: {
        children?: React.ReactNode;
        id?: string;
        style?: unknown;
    }) => {
        const React = require("react");
        const { View } = require("react-native");
        return <View testID={id} style={style}>{children}</View>;
    },
}));

jest.mock("../../Skin/BoxSkin", () => {
    return jest.fn(function BoxSkinMock() {
        const React = require("react");
        const { View } = require("react-native");
        return <View testID="box-skin" />;
    });
});

jest.mock("../BoxList.styles", () => ({
    useBoxListStyles: () => ({
        container: {},
        containerTop: {
            flexDirection: "column",
            position: "relative",
        },
        gridRow: { flexDirection: "row", flexWrap: "nowrap", justifyContent: "center" },
        containerTopHorizontal: {
            flexDirection: "row",
            flexWrap: "nowrap",
            position: "relative",
        },
        horizontalScrollViewport: {},
        horizontalScrollContent: {
            flexDirection: "row",
            position: "relative",
        },
        horizontalBoxItem: {},
        gridBoxItem: {
            width: 150,
        },
        horizontalDebugHeader: {},
        horizontalDebugFooter: {},
        boxWords: {},
        hiddenPromotionAnchor: {
            position: "absolute",
        },
        hiddenCountsAnchor: {
            position: "absolute",
        },
    }),
}));

const makeWord = (id: number, text: string): WordWithTranslations => ({
    id,
    text,
    translations: [text],
    flipped: false,
});

const boxes: BoxesState = {
    boxZero: [],
    boxOne: [makeWord(1, "one")],
    boxTwo: [makeWord(2, "two")],
    boxThree: [],
    boxFour: [],
    boxFive: [],
};

describe("BoxList", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("keeps box artwork unchanged on a parent update but refreshes counts and selection", () => {
        const handleSelectBox = jest.fn();
        const props = { boxes, activeBox: "boxOne" as const, handleSelectBox };
        const screen = render(<BoxList {...props} />);
        jest.mocked(BoxSkin).mockClear();

        // A keyboard visibility render does not change the list's inputs.
        screen.rerender(<BoxList {...props} />);
        expect(BoxSkin).not.toHaveBeenCalled();

        const nextBoxes = { ...boxes, boxTwo: [...boxes.boxTwo, makeWord(3, "three")] };
        screen.rerender(<BoxList {...props} boxes={nextBoxes} activeBox="boxTwo" />);
        const selected = screen.getByRole("button", { name: "box 2 count 2" });
        expect(selected.props.accessibilityState.selected).toBe(true);
        fireEvent.press(selected);
        expect(handleSelectBox).toHaveBeenCalledWith("boxTwo");
        expect(BoxSkin).toHaveBeenCalled();
    });

    it("fits five boxes in one small-phone row with readable counters and working selection", () => {
        const selectBox = jest.fn();
        const screen = render(
            <BoxList boxes={boxes} activeBox="boxOne" handleSelectBox={selectBox}
                hideBoxZero horizontalScroll horizontalRowHeight={83} layoutWidth={336} />
        );
        expect(screen.queryByTestId("box-list-row-0")).toBeNull();
        const items = screen.getAllByTestId(/^box-list-item-/);
        expect(items).toHaveLength(5);
        for (const item of items) {
            const style = ReactNative.StyleSheet.flatten(item.props.style);
            expect(style).toMatchObject({ width: 64, height: 83, minHeight: 83 });
            const count = within(item).UNSAFE_getByType(Text);
            expect(ReactNative.StyleSheet.flatten(count.props.style).lineHeight).toBe(24);
        }
        const scroll = screen.UNSAFE_getByType(ScrollView);
        expect(scroll.props.horizontal).toBe(true);
        expect(scroll.props.keyboardShouldPersistTaps).toBe("handled");
        fireEvent.press(screen.getByRole("button", { name: "box 3 count 0" }));
        expect(selectBox).toHaveBeenCalledWith("boxThree");
    });

    it.each([
        [336, 336 / 345],
        [320, 320 / 345],
        [300, 300 / 345],
        [270, 270 / 345],
        [250, 250 / 345],
        [344.92, 344.92 / 345],
    ])("keeps three classic columns at %s dp", (width, expectedScale) => {
        const layout = getClassicBoxLayout(width);

        expect(layout.columns).toBe(3);
        expect(layout.scale).toBeCloseTo(expectedScale as number);
        expect(layout.itemWidth * 3).toBeCloseTo(width);
    });

    it("uses measured container width for classic layout", () => {
        const screen = render(
            <BoxList
                boxes={boxes}
                activeBox="boxOne"
                handleSelectBox={jest.fn()}
            />
        );

        fireEvent(screen.getByTestId("box-list-viewport"), "layout", {
            nativeEvent: { layout: { width: 336, height: 210 } },
        });

        expect(screen.getByTestId("box-list-item-boxOne").props.style).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    width: expect.closeTo(112, 5),
                }),
            ])
        );
        expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0);
    });

    it.each([250, 320, 344.92, 393])("keeps explicit 3 + 2 rows at %s dp", (width) => {
        const screen = render(
            <BoxList boxes={boxes} activeBox="boxOne" handleSelectBox={jest.fn()} hideBoxZero />
        );
        fireEvent(screen.getByTestId("box-list-viewport"), "layout", {
            nativeEvent: { layout: { width, height: 400 } },
        });
        const rows = screen.getAllByTestId(/^box-list-row-/);
        expect(rows).toHaveLength(2);
        expect(rows.map(row => within(row).getAllByTestId(/^box-list-item-/).map(node => node.props.testID))).toEqual([
            ["box-list-item-boxOne", "box-list-item-boxTwo", "box-list-item-boxThree"],
            ["box-list-item-boxFour", "box-list-item-boxFive"],
        ]);
        expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0);

        screen.rerender(
            <BoxList boxes={boxes} activeBox="boxOne" handleSelectBox={jest.fn()} />
        );
        expect(screen.getAllByTestId(/^box-list-row-/).map(row =>
            within(row).getAllByTestId(/^box-list-item-/).length
        )).toEqual([3, 3]);
    });

    it("includes second-row offsets in the counts tutorial anchor", () => {
        const screen = render(
            <BoxList boxes={boxes} activeBox="boxOne" handleSelectBox={jest.fn()}
                hideBoxZero countsCoachmarkId="counts" />
        );
        fireEvent(screen.getByTestId("box-list-grid"), "layout", {
            nativeEvent: { layout: { width: 345, height: 332 } },
        });
        fireEvent(screen.getByTestId("box-list-row-1"), "layout", {
            nativeEvent: { layout: { x: 0, y: 166, width: 345, height: 166 } },
        });
        fireEvent(screen.getByTestId("box-list-item-boxFive"), "layout", {
            nativeEvent: { layout: { x: 172.5, y: 0, width: 115, height: 166 } },
        });
        fireEvent(screen.getAllByRole("button")[4], "layout", {
            nativeEvent: { layout: { x: 0, y: 0, width: 115, height: 150 } },
        });
        fireEvent(screen.UNSAFE_getAllByType(Text).filter(node =>
            typeof node.props.children === "number"
        )[4], "layout", {
            nativeEvent: { layout: { x: 45, y: 126, width: 20, height: 24 } },
        });
        expect(screen.getByTestId("counts").props.style).toEqual(expect.arrayContaining([
            expect.objectContaining({ left: 213.5, top: 288, width: 28, height: 32 }),
        ]));
    });

    it("scales classic grid items responsively within requested columns", () => {
        jest.spyOn(ReactNative, "useWindowDimensions").mockReturnValue({
            width: 768,
            height: 1024,
            scale: 1,
            fontScale: 1,
        });

        const screen = render(
            <BoxList
                boxes={boxes}
                activeBox="boxOne"
                handleSelectBox={jest.fn()}
                hideBoxZero
                maxColumns={3}
            />
        );

        const row = screen.UNSAFE_getAllByType(View).find(
            (node) =>
                Array.isArray(node.props.style) &&
                node.props.style.some(
                    (style: { maxWidth?: number } | undefined) =>
                        style?.maxWidth === 630
                )
        );
        expect(row).toBeTruthy();

        expect(screen.getByTestId("box-list-item-boxOne").props.style).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ width: 210, minHeight: 234 }),
            ])
        );
    });

    it("keeps hidden coachmark anchors aligned in horizontal layout coordinates", async () => {
        const screen = render(
            <BoxList
                boxes={boxes}
                activeBox="boxOne"
                handleSelectBox={jest.fn()}
                hideBoxZero
                horizontalScroll
                countsCoachmarkId="review-flashcards-box-counts"
            />
        );

        const horizontalContainer = screen.UNSAFE_getAllByType(View).find(
            (node) =>
                Array.isArray(node.props.style) &&
                node.props.style.some(
                    (style: { flexWrap?: string } | undefined) =>
                        style?.flexWrap === "nowrap"
                )
        );
        expect(horizontalContainer).toBeTruthy();

        fireEvent(horizontalContainer!, "layout", {
            nativeEvent: { layout: { width: 320, height: 210 } },
        });

        act(() => {
            screen.getByTestId("box-list-item-boxOne").props.onLayout({
                nativeEvent: { layout: { x: 78, y: 0, width: 164, height: 210 } },
            });
            screen.getByTestId("box-list-item-boxTwo").props.onLayout({
                nativeEvent: { layout: { x: 242, y: 0, width: 164, height: 210 } },
            });
        });

        const pressables = screen.getAllByRole("button");
        for (const pressable of pressables) {
            fireEvent(pressable, "layout", {
                nativeEvent: {
                    layout: { x: 0, y: 0, width: 164, height: 210 },
                },
            });
        }

        const countTexts = screen
            .UNSAFE_getAllByType(Text)
            .filter((node) => typeof node.props.children === "number");
        for (const countText of countTexts) {
            fireEvent(countText, "layout", {
                nativeEvent: { layout: { x: 72, y: 150, width: 20, height: 24 } },
            });
        }

        await waitFor(() => {
            const promotionAnchor = screen.getByTestId(
                "flashcards-promotion-arrow-anchor"
            );
            const countsAnchor = screen.getByTestId("review-flashcards-box-counts");

            expect(promotionAnchor).toBeTruthy();
            expect(countsAnchor).toBeTruthy();
            expect(promotionAnchor.props.style).toEqual(
                expect.arrayContaining([expect.objectContaining({ left: 241.5 })])
            );
            expect(countsAnchor.props.style).toEqual(
                expect.arrayContaining([expect.objectContaining({ left: 146 })])
            );
        });
    });
});
