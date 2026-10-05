---
name: research-figures
description: "Produce publication-grade figures for a thesis or paper from result data: matplotlib with a consistent, colour-blind-safe style file, vector output sized to the text width, one figure per claim, variance shown, direct labels over legends, and captions that carry the argument; plus TikZ for architecture and method diagrams. Use when a results section needs figures, when a supervisor calls a plot unreadable, or when the document's figures do not match each other."
argument-hint: "(optional) the data file or script, the claim the figure supports, and the target width"
---

A figure earns its place by making one claim visible faster than the table does. Design from the claim, not from the data: decide what the reader must see, then choose the encoding that shows it.

## Rules that apply to every figure

- **One claim per figure.** If the caption needs "and also", split it.
- **Vector output** (`.pdf` for LaTeX, `.svg` or 300-dpi `.png` for Word) at the final printed size, so fonts are not scaled. Text width in a typical thesis is about 6 inches (15 cm); set `figsize` accordingly and never rescale in the document.
- **Fonts match the document**: same family (or the closest available) and a size between the caption size and the body size (9 to 11 pt at print size). Set once in the style file.
- **Colour-blind-safe palette** (Okabe-Ito or viridis for sequential data). Never encode a difference by colour alone: vary marker or line style too, and check the figure in greyscale.
- **Show variance**: error bars, confidence bands, or individual points. State in the caption what the bar is (SD, SEM, 95% CI) and n.
- **Direct labels** at line ends beat legends when there are fewer than six series.
- **Axes** start at zero for bar charts; for line charts, start where the data live and say so. Label with quantity and unit. Log scale when the data span orders of magnitude, stated in the label.
- **No chartjunk**: no 3D, no gradients, no gridlines heavier than the data, no titles inside the figure (the caption is the title).
- **Consistency**: the same variable has the same colour in every figure of the thesis. Keep a `colors` dict in the style module.
- **Reproducible**: every figure comes from a script in `figures/src/` that reads the data file and writes the output. No hand-edited figures.

## Setup

`figures/src/style.py`:

```python
import matplotlib as mpl
import matplotlib.pyplot as plt

OKABE_ITO = ["#0072B2", "#E69F00", "#009E73", "#D55E00", "#CC79A7", "#56B4E9", "#F0E442", "#000000"]
COLORS = {"baseline": OKABE_ITO[0], "ours": OKABE_ITO[3]}   # one entry per named series, thesis-wide

def use_thesis_style(text_width_in=6.0, ratio=0.6):
    mpl.rcParams.update({
        "figure.figsize": (text_width_in, text_width_in * ratio),
        "font.family": "serif", "font.size": 10,
        "axes.labelsize": 10, "axes.titlesize": 10,
        "xtick.labelsize": 9, "ytick.labelsize": 9, "legend.fontsize": 9,
        "axes.prop_cycle": mpl.cycler(color=OKABE_ITO),
        "axes.spines.top": False, "axes.spines.right": False,
        "axes.grid": True, "grid.alpha": 0.3, "grid.linewidth": 0.5,
        "lines.linewidth": 1.5, "lines.markersize": 4,
        "errorbar.capsize": 2,
        "savefig.bbox": "tight", "savefig.pad_inches": 0.02,
        "pdf.fonttype": 42, "ps.fonttype": 42,        # embed TrueType, editable text
        "text.usetex": False,                          # True if the LaTeX toolchain is present
    })
```

A figure script:

```python
import pandas as pd, matplotlib.pyplot as plt
from style import use_thesis_style, COLORS
use_thesis_style()
df = pd.read_csv("../../results/latency.csv")
fig, ax = plt.subplots()
for name, g in df.groupby("system"):
    m, s = g.groupby("n")["ms"].mean(), g.groupby("n")["ms"].std()
    ax.plot(m.index, m, marker="o", color=COLORS[name], label=name)
    ax.fill_between(m.index, m - s, m + s, color=COLORS[name], alpha=0.2)
    ax.annotate(name, (m.index[-1], m.iloc[-1]), xytext=(4, 0), textcoords="offset points", va="center", color=COLORS[name])
ax.set_xlabel("Input size (items)"); ax.set_ylabel("Latency (ms)"); ax.set_xscale("log")
fig.savefig("../latency.pdf")
```

## Choosing the encoding

| To show | Use | Avoid |
| --- | --- | --- |
| a trend over an ordered variable | line with band | bars |
| comparison of a few categories | dot plot or horizontal bars, sorted | pie, stacked bars with many parts |
| distribution | box plot with points, violin, or ECDF | bar of the mean alone |
| relationship between two measures | scatter with a fitted line and its CI | connected scatter |
| composition | stacked bar only with two or three parts; otherwise a table | 3D anything |
| many small comparisons | small multiples with shared axes | one crowded plot |
| an architecture or pipeline | TikZ or a drawing tool exported to PDF, consistent box and arrow styles | screenshots of slides |

## Captions

Caption = what is shown + conditions + what to notice. "Latency by input size for the baseline and the proposed system (mean of 10 runs, shaded band is one SD, log x-axis). The proposed system's advantage grows with input size, reaching 4x at 10^5 items." The reader should get the claim from the caption without the body text.

## Diagrams

For system and method diagrams use TikZ (`tikzpicture` with `positioning` and `arrows.meta` libraries, one shared style block for nodes) so fonts and line weights match the document. Keep each diagram in its own `.tex` file under `figures/`, `\input` it, and compile standalone with the `standalone` class to preview. Export to PDF for Word.

## Before including

Print the figure at final size in greyscale. If a series cannot be told apart, or a label is under 8 pt, fix it. Check every figure is referenced in the text before it appears.

## Attribution

Palette and rcParams conventions draw on [thesis-figure-skill](https://github.com/0xe1337/thesis-figure-skill) (MIT) and the Okabe-Ito palette; the encoding table and rules are this repository's.
