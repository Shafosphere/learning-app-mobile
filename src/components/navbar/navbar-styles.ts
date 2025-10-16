import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
const LOGO_ASPECT_RATIO = 523 / 555;
export const useStyles = createThemeStylesHook((colors) => ({
  layout: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBarContainer: {
    backgroundColor: colors.secondBackground,
    paddingHorizontal: 14,
    paddingBottom: 0,
    overflow: "visible",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 50,
    position: "relative",
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rightGroup: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentInner: {
    flex: 1,
  },
  logo: {
    width: 60,
    aspectRatio: LOGO_ASPECT_RATIO,
  },
  logoButton: {
    paddingVertical: 0,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginHorizontal: 8,
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrapper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  icon: {
    color: colors.headline,
  },
  iconButton: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    // marginRight: 6,
  },
  iconButtonPressed: {
    backgroundColor: colors.my_green,
  },
  bottomBarContainer: {
    backgroundColor: colors.secondBackground,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  bottomBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomIconButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  bottomCenterButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 16,
    marginHorizontal: 12,
  },
  bottomIconButtonPressed: {
    backgroundColor: colors.my_green,
  },
  courseButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  courseFlag: {
    width: 99 / 2.7,
    height: 66 / 2.7,
    borderRadius: 4,
  },
  customCourseIconWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: {
    marginLeft: 8,
    color: colors.headline,
    fontWeight: "700",
    fontSize: 16,
    textAlign: "right",
  },
  courseName: {
    marginLeft: 8,
    color: colors.headline,
    fontWeight: "600",
    fontSize: 16,
    flexShrink: 1,
  },
  right: {
    display: "flex",
    flexDirection: "row",
    // backgroundColor: "red",
    margin: 0,
    padding: 0,
  },
}));
