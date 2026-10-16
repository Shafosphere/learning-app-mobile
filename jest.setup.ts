import "@testing-library/jest-native/extend-expect";

jest.mock(
  "@react-native-async-storage/async-storage",
  () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

jest.mock("react-native-pager-view", () => {
  const React = require("react");
  const { View } = require("react-native");
  const mockSetPage = jest.fn();
  const mockSetPageWithoutAnimation = jest.fn();
  const mockSetScrollEnabled = jest.fn();
  const MockPagerView = React.forwardRef((props: object, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({
      setPage: mockSetPage,
      setPageWithoutAnimation: mockSetPageWithoutAnimation,
      setScrollEnabled: mockSetScrollEnabled,
    }));
    return React.createElement(View, props);
  });
  return { __esModule: true, default: Object.assign(MockPagerView, {
    mockSetPage, mockSetPageWithoutAnimation, mockSetScrollEnabled,
  }) };
});
