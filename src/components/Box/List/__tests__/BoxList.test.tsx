/* eslint-disable @typescript-eslint/no-require-imports */
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Text, View } from "react-native";
import BoxList from "../BoxList";

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
    return function BoxSkinMock() {
        const React = require("react");
        const { View } = require("react-native");
        return <View testID="box-skin" />;
    };
});

jest.mock("../BoxList.styles", () => ({
    useBoxListStyles: () => ({
        container: {},
        containerTop: {
            flexDirection: "row",
            flexWrap: "wrap",
            position: "relative",
        },
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

const boxes = {
    boxZero: [],
    boxOne: ["one"],
    boxTwo: ["two"],
    boxThree: [],
    boxFour: [],
    boxFive: [],
};

describe("BoxList", () => {
    it("caps classic layout to requested columns", () => {
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
                        style?.maxWidth === 450
                )
        );
        expect(row).toBeTruthy();

        expect(screen.getByTestId("box-list-item-boxOne").props.style).toEqual(
            expect.arrayContaining([expect.objectContaining({ width: 150 })])
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
