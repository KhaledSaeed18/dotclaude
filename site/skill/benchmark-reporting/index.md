---
name: benchmark-reporting
description: "Report computational benchmarks and experimental comparisons the way examiners and reviewers expect: fair baselines run under the same conditions, multiple seeds with variance, hardware and configuration disclosed, tables generated from result files with consistent precision and the best result marked by rule, ablations that isolate each component, and honest treatment of losses and failure cases. Use when writing the results chapter of a systems or ML thesis, when a comparison table needs to be built, or when a reviewer questions whether a comparison is fair."
argument-hint: "(optional) the results directory or CSV, the baselines, and the metrics"
---

A comparison is credible when the reader can see that every system had the same chance. Most rejected results chapters fail on fairness or on variance, not on the numbers themselves.

## Fairness

- **Same conditions**: same hardware, same data splits, same preprocessing, same evaluation script, same budget (epochs, wall-clock, or tokens; state which). Numbers copied from other papers are labelled as such in the table and are not the headline comparison.
- **Tuned baselines**: each baseline gets the hyperparameter search the proposed method got, or its authors' recommended settings, stated. Record the search space and budget per system.
- **Current baselines**: the strongest published method for the task at thesis time, not a convenient old one. If the strongest is out of reach (compute, code), say so and compare with what is feasible.
- **Same metric implementation**: one evaluation script for all systems; metric definitions and any thresholds stated.

## Variance

- Every number is a mean over ≥ 3 seeds (or runs, or folds) with SD or a 95% CI, and n stated in the caption. A single run is reported as such and not compared.
- Statistical comparison where it matters (`statistics-advisor`): a paired test across seeds or folds, effect size, corrected for the number of comparisons.
- Do not bold a "best" whose CI overlaps the runner-up; bold all that are statistically indistinguishable from the best, and say the rule in the caption.

## Disclosure

A configuration section or appendix table per experiment: hardware (GPU model and count, CPU, RAM), software versions, dataset version and splits, hyperparameters per system, training budget, inference settings, total compute used (GPU-hours). Cite the commit hash from `experiment-reproducibility`.

## Tables

Generated from `results/*.csv` by a script into `tables/*.tex` (or Markdown), never typed:

- Rows: systems; columns: metrics (or datasets); grouped columns for several datasets. Transpose when there are more metrics than systems.
- Units in headers; arrows or "higher is better" once in the caption; consistent decimals per column (usually 1 or 2); thousands separators.
- Mean ± SD in one cell (`92.3 ± 0.4`) or mean with CI in a second line; n in the caption.
- Best in bold by rule (see above); proposed system's row last or highlighted, not first.
- Missing cells explained in a footnote (did not converge, out of memory, not applicable) rather than left blank.
- `booktabs` in LaTeX; `siunitx` `S` columns align decimals.

Example generator sketch:

```python
import pandas as pd
df = pd.read_csv("results/main.csv")            # columns: system, dataset, metric, seed, value
agg = df.groupby(["system","dataset","metric"]).value.agg(["mean","std","count"]).reset_index()
# format, mark best per (dataset, metric) with a CI-overlap rule, pivot, write tables/main.tex via DataFrame.to_latex or a template
```

## Ablations

One row per removed or replaced component, everything else fixed, same seeds. The full system's row and the closest baseline's row appear in the same table for reference. Report the delta with its CI. An ablation that removes two things at once tells the reader nothing.

## Scaling and sensitivity

When the claim involves size or a parameter: a line plot across the range with bands (`research-figures`), including the point where the advantage disappears if there is one.

## Losses and failures

Report every dataset or setting where the proposed system does not win, in the main table, and discuss why in the discussion chapter. A results chapter with no losses invites the examiner to look for what was left out. Include a qualitative failure analysis (a small table of representative errors with categories and counts) when the task allows.

## Efficiency

Alongside quality: training time, inference latency (median and p95 over ≥ 1000 requests, batch size stated), memory, parameter count, energy or cost when relevant. A method that is 1% better and 10x slower is a trade-off, and the table should show it.

## Caption template

"Table 4.2: Accuracy (%) on the three datasets, mean ± SD over 5 seeds. Bold marks results whose 95% CI overlaps the best in each column. All systems trained for 20 epochs on one A100 with the hyperparameters in Appendix B; baselines tuned with the same 20-trial search. † copied from the original paper (different splits), shown for reference only."
