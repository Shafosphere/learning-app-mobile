#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import math
from dataclasses import dataclass
from pathlib import Path
import xml.etree.ElementTree as ET

SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)

SHAPE_TAGS = {"line", "polyline", "polygon", "path", "ellipse", "rect", "circle"}
PATTERN_GEOMETRY_TAGS = {"line", "polyline", "polygon", "path", "circle"}


@dataclass(frozen=True)
class Pt:
    x: float
    y: float


def local_name(tag: str) -> str:
    return tag.split("}", 1)[-1] if "}" in tag else tag


def parse_style_class_map(svg_root: ET.Element) -> dict[str, str]:
    class_to_style: dict[str, str] = {}
    for style in svg_root.iter():
        if local_name(style.tag) != "style":
            continue
        css = style.text or ""
        # Parse blocks: "selector, selector { decl }"
        idx = 0
        while idx < len(css):
            lcurly = css.find("{", idx)
            if lcurly == -1:
                break
            rcurly = css.find("}", lcurly + 1)
            if rcurly == -1:
                break
            selectors = css[idx:lcurly].strip()
            decl = " ".join(css[lcurly + 1 : rcurly].strip().split())
            idx = rcurly + 1
            if not selectors or not decl:
                continue
            for raw_sel in selectors.split(","):
                sel = raw_sel.strip()
                if not sel.startswith("."):
                    continue
                class_name = sel[1:]
                if not class_name:
                    continue
                prev = class_to_style.get(class_name, "")
                merged = f"{prev.rstrip('; ')}; {decl}" if prev else decl
                class_to_style[class_name] = merged.strip()
    return class_to_style


def inline_class_styles(svg_root: ET.Element) -> None:
    class_styles = parse_style_class_map(svg_root)
    if not class_styles:
        return
    for elem in svg_root.iter():
        class_attr = elem.attrib.get("class")
        if not class_attr:
            continue
        parts = [p.strip() for p in class_attr.split() if p.strip()]
        styles = [class_styles[p] for p in parts if p in class_styles]
        if not styles:
            continue
        existing_style = elem.attrib.get("style", "").strip()
        merged = "; ".join([s.strip().rstrip(";") for s in ([existing_style] + styles) if s])
        if merged:
            elem.set("style", merged + ";")
        elem.attrib.pop("class", None)


def remove_defs(svg_root: ET.Element) -> None:
    for child in list(svg_root):
        if local_name(child.tag) == "defs":
            svg_root.remove(child)


def parse_style_pairs(style: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for part in style.split(";"):
        if ":" not in part:
            continue
        key, val = part.split(":", 1)
        k = key.strip().lower()
        v = val.strip()
        if k:
            result[k] = v
    return result


def style_pairs_to_str(pairs: dict[str, str]) -> str:
    return ";".join(f"{k}:{v}" for k, v in pairs.items()) + ";"


def recolor_outline(svg_root: ET.Element, outline_stroke: str) -> None:
    for elem in svg_root.iter():
        tag = local_name(elem.tag)
        if tag not in SHAPE_TAGS:
            continue
        style = parse_style_pairs(elem.attrib.get("style", ""))

        # Normalize stroke colors for outline geometry.
        if "stroke" in style:
            style["stroke"] = outline_stroke

        if "stroke" in elem.attrib:
            elem.set("stroke", outline_stroke)

        # Keep stars bright in outline.
        if tag == "circle":
            fill_val = style.get("fill") or elem.attrib.get("fill")
            if fill_val and fill_val.lower() != "none":
                style["fill"] = outline_stroke
                elem.attrib.pop("fill", None)

        if style:
            elem.set("style", style_pairs_to_str(style))


def collect_circle_points(svg_root: ET.Element) -> list[Pt]:
    pts: list[Pt] = []
    for elem in svg_root.iter():
        if local_name(elem.tag) != "circle":
            continue
        cx = elem.attrib.get("cx")
        cy = elem.attrib.get("cy")
        if cx is None or cy is None:
            continue
        try:
            pts.append(Pt(float(cx), float(cy)))
        except ValueError:
            continue
    return pts


def bbox(points: list[Pt]) -> tuple[float, float, float, float]:
    xs = [p.x for p in points]
    ys = [p.y for p in points]
    return min(xs), min(ys), max(xs), max(ys)


def solve_similarity_scale_translate(src: list[Pt], dst: list[Pt]) -> tuple[float, float, float]:
    # dst ~= s * src + t
    n = min(len(src), len(dst))
    if n == 0:
        return 1.0 / 3.0, 0.0, 0.0
    sx = sum(p.x for p in src[:n]) / n
    sy = sum(p.y for p in src[:n]) / n
    dx = sum(p.x for p in dst[:n]) / n
    dy = sum(p.y for p in dst[:n]) / n

    num = 0.0
    den = 0.0
    for i in range(n):
        ux = src[i].x - sx
        uy = src[i].y - sy
        vx = dst[i].x - dx
        vy = dst[i].y - dy
        num += ux * vx + uy * vy
        den += ux * ux + uy * uy

    s = (num / den) if den > 1e-9 else (1.0 / 3.0)
    tx = dx - s * sx
    ty = dy - s * sy
    return s, tx, ty


def match_points_nearest(pattern_pts: list[Pt], outline_pts: list[Pt], s: float, tx: float, ty: float) -> list[Pt]:
    if not pattern_pts or not outline_pts:
        return []
    used: set[int] = set()
    matched: list[Pt] = []
    for p in pattern_pts:
        px = s * p.x + tx
        py = s * p.y + ty
        best_idx = None
        best_dist = float("inf")
        for i, o in enumerate(outline_pts):
            if i in used:
                continue
            d = (o.x - px) * (o.x - px) + (o.y - py) * (o.y - py)
            if d < best_dist:
                best_dist = d
                best_idx = i
        if best_idx is None:
            break
        used.add(best_idx)
        matched.append(outline_pts[best_idx])
    return matched


def estimate_pattern_transform(pattern_pts: list[Pt], outline_pts: list[Pt]) -> tuple[float, float, float]:
    if not pattern_pts or not outline_pts:
        return 1.0 / 3.0, 0.0, 0.0

    pminx, pminy, pmaxx, pmaxy = bbox(pattern_pts)
    ominx, ominy, omaxx, omaxy = bbox(outline_pts)

    pwidth = max(pmaxx - pminx, 1e-6)
    pheight = max(pmaxy - pminy, 1e-6)
    owidth = max(omaxx - ominx, 1e-6)
    oheight = max(omaxy - ominy, 1e-6)

    s0 = (owidth / pwidth + oheight / pheight) / 2.0
    p_cx = sum(p.x for p in pattern_pts) / len(pattern_pts)
    p_cy = sum(p.y for p in pattern_pts) / len(pattern_pts)
    o_cx = sum(p.x for p in outline_pts) / len(outline_pts)
    o_cy = sum(p.y for p in outline_pts) / len(outline_pts)
    tx0 = o_cx - s0 * p_cx
    ty0 = o_cy - s0 * p_cy

    # 2 refinement rounds using nearest-neighbor pairing.
    s, tx, ty = s0, tx0, ty0
    for _ in range(2):
        matched_outline = match_points_nearest(pattern_pts, outline_pts, s, tx, ty)
        n = min(len(pattern_pts), len(matched_outline))
        if n < 2:
            break
        s, tx, ty = solve_similarity_scale_translate(pattern_pts[:n], matched_outline[:n])
    return s, tx, ty


def build_pattern_overlay(pattern_root: ET.Element, s: float, tx: float, ty: float, pattern_color: str) -> ET.Element:
    overlay = ET.Element(f"{{{SVG_NS}}}g", {
        "id": "pattern-overlay",
        "transform": f"matrix({s:.10f} 0 0 {s:.10f} {tx:.4f} {ty:.4f})",
    })

    min_stroke_360 = 2.2
    src_stroke = max(1.5, min_stroke_360 / max(s, 1e-9))
    stroke_str = f"{src_stroke:.3f}".rstrip("0").rstrip(".")

    for elem in pattern_root.iter():
        tag = local_name(elem.tag)
        if tag not in PATTERN_GEOMETRY_TAGS:
            continue
        cloned = copy.deepcopy(elem)
        cloned.attrib.pop("class", None)
        if tag == "circle":
            cloned.set("style", f"fill:{pattern_color};stroke:none;")
        else:
            cloned.set(
                "style",
                f"fill:none;stroke:{pattern_color};stroke-linejoin:round;stroke-linecap:round;stroke-width:{stroke_str}px;",
            )
        overlay.append(cloned)
    return overlay


def merge_pair(
    outline_path: Path,
    pattern_path: Path,
    output_path: Path,
    outline_stroke: str,
    pattern_color: str,
) -> tuple[float, float, float, int, int]:
    outline_tree = ET.parse(outline_path)
    outline_root = outline_tree.getroot()
    pattern_tree = ET.parse(pattern_path)
    pattern_root = pattern_tree.getroot()

    inline_class_styles(outline_root)
    remove_defs(outline_root)
    recolor_outline(outline_root, outline_stroke)

    outline_pts = collect_circle_points(outline_root)
    pattern_pts = collect_circle_points(pattern_root)
    s, tx, ty = estimate_pattern_transform(pattern_pts, outline_pts)

    overlay = build_pattern_overlay(pattern_root, s, tx, ty, pattern_color)
    outline_root.append(overlay)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    outline_tree.write(output_path, encoding="utf-8", xml_declaration=True)
    return s, tx, ty, len(outline_pts), len(pattern_pts)


def pair_bases(base_dir: Path) -> list[str]:
    outlines = sorted(base_dir.glob("*-outline.svg"))
    bases: list[str] = []
    for o in outlines:
        base = o.name[: -len("-outline.svg")]
        if (base_dir / f"{base}-pattern.svg").exists():
            bases.append(base)
    return bases


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Merge constellation outline + pattern SVG files.")
    parser.add_argument("--outline", type=Path, help="Path to one outline SVG.")
    parser.add_argument("--pattern", type=Path, help="Path to one pattern SVG.")
    parser.add_argument("--output", type=Path, help="Path to merged output SVG.")
    parser.add_argument(
        "--base-dir",
        type=Path,
        default=Path("assets/images/forFlashcards/gwiazdozbiory"),
        help="Directory with source SVG files.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("assets/images/forFlashcards/gwiazdozbiory/generated"),
        help="Directory for generated merged SVG files.",
    )
    parser.add_argument("--all", action="store_true", help="Generate merged files for all pairs.")
    parser.add_argument("--outline-stroke", default="#1B2D45")
    parser.add_argument("--pattern-color", default="#FF5470")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.all:
        bases = pair_bases(args.base_dir)
        if not bases:
            print("No matching outline/pattern pairs found.")
            return 1
        print(f"Found {len(bases)} pairs. Generating...")
        for base in bases:
            outline = args.base_dir / f"{base}-outline.svg"
            pattern = args.base_dir / f"{base}-pattern.svg"
            output = args.output_dir / f"{base}-merged.svg"
            s, tx, ty, oc, pc = merge_pair(
                outline, pattern, output, args.outline_stroke, args.pattern_color
            )
            print(
                f"{base:24s} -> {output.name:28s} "
                f"s={s:.5f} tx={tx:.2f} ty={ty:.2f} circles(o/p)={oc}/{pc}"
            )
        return 0

    if not (args.outline and args.pattern and args.output):
        print("For single file mode provide: --outline --pattern --output (or use --all).")
        return 2

    s, tx, ty, oc, pc = merge_pair(
        args.outline, args.pattern, args.output, args.outline_stroke, args.pattern_color
    )
    print(
        f"Generated: {args.output}\n"
        f"transform: s={s:.5f} tx={tx:.2f} ty={ty:.2f} circles(o/p)={oc}/{pc}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
