import type { ReviewEmptyMessage } from "../reviewEmptyMessages";

function freshSelector() {
  let select!: () => ReviewEmptyMessage;
  jest.isolateModules(() => {
    select = jest.requireActual<typeof import("../reviewEmptyMessages")>("../reviewEmptyMessages").selectReviewEmptyMessage;
  });
  return select;
}

afterEach(() => jest.restoreAllMocks());

it.each([
  [0, "break"],
  [0.34, "allReviewed"],
  [0.99, "comeBackLater"],
])("allows every message on the first visit (%s)", (random, expected) => {
  jest.spyOn(Math, "random").mockReturnValue(random as number);
  expect(freshSelector()()).toBe(expected);
});

it.each([0, 0.99])("excludes the previous message on subsequent visits (%s)", (random) => {
  jest.spyOn(Math, "random").mockReturnValue(random);
  const select = freshSelector();
  let previous = select();
  for (let visit = 0; visit < 20; visit++) {
    const next = select();
    expect(next).not.toBe(previous);
    previous = next;
  }
});

it("keeps session history when the selector is imported again", () => {
  jest.spyOn(Math, "random").mockReturnValue(0);
  jest.isolateModules(() => {
    const first = jest.requireActual<typeof import("../reviewEmptyMessages")>("../reviewEmptyMessages").selectReviewEmptyMessage();
    expect(jest.requireActual<typeof import("../reviewEmptyMessages")>("../reviewEmptyMessages").selectReviewEmptyMessage()).not.toBe(first);
  });
});
