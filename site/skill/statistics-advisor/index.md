---
name: statistics-advisor
description: "Plan and check the statistics for an empirical study: choose the test from the design and data type, check assumptions and pick the robust alternative, compute sample size from a target effect, report effect sizes and confidence intervals alongside p-values, handle multiple comparisons, and write the analysis paragraph in the form reviewers expect; with runnable Python (scipy, statsmodels, pingouin) or R snippets. Use before collecting data (the analysis plan), after collecting it (running and reporting), or when a result says significant and the reviewer asks how."
argument-hint: "(optional) the design, the variables, the data file, or the result to check"
---

Statistics answer one question: how much of what was observed could be chance, and how big is the effect if it is real. Everything here serves reporting both parts honestly. Decide the analysis before seeing the data, and report deviations from that plan.

## Step 1: describe the data before testing it

Always: n per group, mean and SD (or median and IQR for skewed data), min and max, missing values and why. Plot it (`research-figures`): a box plot with points or an ECDF per group shows more than any test. Check the shape (histogram, Q-Q plot) and the outliers, and decide how outliers are handled *by rule* (pre-specified), not by looking at which removal helps.

## Step 2: choose the test

| Comparison | Data | Parametric | Non-parametric / robust |
| --- | --- | --- | --- |
| two independent groups | continuous | Welch's t-test (default over Student's) | Mann-Whitney U; bootstrap CI of the difference |
| two paired measurements | continuous | paired t-test | Wilcoxon signed-rank |
| three or more groups | continuous | one-way ANOVA (Welch) then Games-Howell post hoc | Kruskal-Wallis then Dunn with Holm |
| repeated measures over conditions | continuous | repeated-measures ANOVA or mixed model | Friedman; mixed model with robust SE |
| two categorical variables | counts | chi-square (expected counts ≥ 5) | Fisher's exact |
| relationship between two continuous | continuous | Pearson r | Spearman rho; Kendall tau for small n |
| outcome from several predictors | continuous | multiple regression | robust regression; quantile regression |
| binary outcome from predictors | binary | logistic regression | penalised logistic (small n) |
| Likert items | ordinal | treat a validated scale total as interval | ordinal regression per item; never a t-test on one item |
| time to event | durations with censoring | Cox regression | Kaplan-Meier with log-rank |
| agreement between raters | categorical | Cohen's kappa (2 raters), Fleiss (more) | Krippendorff's alpha |

Prefer estimation over testing when the question is "how much": report the difference with a 95% CI (bootstrap when in doubt) and let the p-value be secondary.

## Step 3: check assumptions, then decide

- Normality of *residuals* (not raw data) for t-tests and ANOVA; with n ≥ 30 per group the t-test is robust to moderate skew. Shapiro-Wilk is informative for small n only; look at the Q-Q plot.
- Equal variances: use Welch by default and stop testing for it.
- Independence: the assumption most often violated in CS (multiple measurements per participant, per repository, per run). Nested data needs a mixed model with a random intercept per cluster, or aggregation to one value per cluster.
- Outliers: report with and without, if a pre-specified rule removed any.

## Step 4: sample size and power

Before collecting: with the smallest effect worth detecting (from the literature or a pilot), alpha 0.05, power 0.8:

```python
from statsmodels.stats.power import TTestIndPower
TTestIndPower().solve_power(effect_size=0.5, alpha=0.05, power=0.8)   # ≈ 64 per group for d = 0.5
```

After collecting, do not compute "post hoc power" from the observed effect (it is a function of the p-value); report the CI instead.

## Step 5: effect sizes

Always alongside p: Cohen's d (or Hedges' g for small n) for mean differences; Cliff's delta or rank-biserial for non-parametric; eta-squared or omega-squared for ANOVA; odds ratio or risk ratio for binary; r itself for correlations. Interpret with field norms, not only Cohen's small/medium/large.

## Step 6: multiple comparisons

State the family: all tests answering one research question. Control with Holm (default; more powerful than Bonferroni) or Benjamini-Hochberg FDR for exploratory sets. Report adjusted p or say "Holm-adjusted". Do not run twenty tests and report the three that passed.

## Step 7: report

The paragraph reviewers expect, per test:

> Fix time was lower with LLM feedback (median 142 s, IQR 98 to 210, n = 20) than with rule-based feedback (median 233 s, IQR 160 to 305, n = 20). Because the distributions were right-skewed, we compared log-transformed times with Welch's t-test, t(36.2) = 3.41, p = .002, Hedges' g = 1.05, 95% CI [0.39, 1.71]; a Mann-Whitney U test agreed (U = 88, p = .003, Cliff's delta = 0.56). Two participants were excluded by the pre-registered rule (task not attempted).

Elements: descriptives with n, the test and why, the statistic with df, exact p (not "p < .05" unless below .001), effect size with CI, robustness check, exclusions.

Words to avoid: "significant" without a test; "marginally significant"; "proves"; "trend towards" for p between .05 and .10 (say not significant).

## Runnable snippets

```python
import pingouin as pg, pandas as pd
df = pd.read_csv("results.csv")
pg.ttest(df[df.cond=="llm"].log_time, df[df.cond=="rule"].log_time, correction=True)   # Welch, with CI and Hedges g
pg.mwu(df[df.cond=="llm"].time, df[df.cond=="rule"].time)                                 # Mann-Whitney with CLES
pg.anova(dv="score", between="cond", data=df, effsize="np2")
pg.pairwise_tests(dv="score", between="cond", data=df, padjust="holm", effsize="hedges")
pg.mixed_anova(dv="score", within="task", between="cond", subject="pid", data=df)
```

R equivalents: `t.test(..., var.equal = FALSE)`, `wilcox.test`, `effectsize::hedges_g`, `lme4::lmer(score ~ cond + (1|pid))`, `p.adjust(method = "holm")`.

## Qualitative data

For interviews and open responses: thematic analysis (Braun and Clarke's six phases), with a codebook, two coders on a sample and an agreement statistic, and quotes tied to participant ids. Count themes to describe prevalence, not to test hypotheses.

## Attribution

Test selection table extended from [claude-statistical-analysis-skill](https://github.com/terryfyl/claude-statistical-analysis-skill) by terryfyl (MIT); the reporting template and the pingouin snippets are this repository's.
