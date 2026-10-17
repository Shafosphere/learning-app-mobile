import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import ts from "typescript";

// Jest's Reanimated mock cannot detach native view descriptors. Exercise the
// installed dependency's real lifecycle/style methods with native services stubbed.
function createHarness() {
  const root = dirname(require.resolve("react-native-reanimated/package.json"));
  const source = ts.createSourceFile("AnimatedComponent.tsx", readFileSync(join(root,
    "src/createAnimatedComponent/AnimatedComponent.tsx"), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = source.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === "AnimatedComponent") as ts.ClassDeclaration;
  const names = ["componentDidMount", "_detachStyles", "_handleAnimatedStylesUpdate", "_updateAnimatedStylesAndProps"];
  const methods = component.members.filter(node => ts.isMethodDeclaration(node) && names.includes(node.name.getText(source)));
  expect(methods).toHaveLength(names.length);
  const code = ts.transpileModule(`class Harness extends Base { ${methods.map(node => node.getText(source)).join("\n")} }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
  }).outputText;
  const Harness = new Function("Base", "IS_WEB", "IS_JEST", "NativeEventsManager", "LayoutAnimationType", `${code}; return Harness;`)(
    class { componentDidMount() {} }, false, false,
    class { attachEvents() {} }, { LAYOUT: "layout", EXITING: "exiting" },
  );
  const instance = new Harness();
  Object.assign(instance, {
    props: {}, _animatedStyles: [], _prevAnimatedStyles: [], _animatedProps: [], _prevAnimatedProps: [],
    jestAnimatedStyle: { value: {} }, jestAnimatedProps: { value: {} },
    _InlinePropManager: { attachInlineProps: jest.fn() },
    _configureLayoutAnimation: jest.fn(),
    _getViewInfo: () => ({ viewTag: 42, shadowNodeWrapper: {} }),
    getComponentViewTag: () => 42,
  });
  return instance;
}

function createStyle() {
  const tags = new Set<number>();
  return { tags, viewDescriptors: {
    add: jest.fn(({ tag }: { tag: number }) => tags.add(tag)),
    remove: jest.fn((tag: number) => tags.delete(tag)),
  } };
}

it("reattaches an unchanged animated style after a retained tree is hidden and revealed", () => {
  const component = createHarness();
  const style = createStyle();
  component._animatedStyles = [style];
  component.componentDidMount();
  expect(style.tags.has(42)).toBe(true);

  // A normal render establishes identical previous/current styles. Suspense hide
  // detaches them; reveal replays componentDidMount on the retained instance.
  component._prevAnimatedStyles = [style];
  component._detachStyles();
  expect(style.tags.size).toBe(0);
  component.componentDidMount();
  expect(style.tags.has(42)).toBe(true);
  expect(style.viewDescriptors.add).toHaveBeenCalledTimes(2);

  component._prevAnimatedStyles = [style];
  component._updateAnimatedStylesAndProps();
  expect(style.viewDescriptors.add).toHaveBeenCalledTimes(2);
});

it("also restores unchanged animated props on the retained native view", () => {
  const component = createHarness();
  const props = createStyle();
  component.props.animatedProps = props;
  component._animatedProps = [props];
  component.componentDidMount();
  component._prevAnimatedProps = [props];
  component._detachStyles();
  component.componentDidMount();
  expect(props.tags.has(42)).toBe(true);
});
