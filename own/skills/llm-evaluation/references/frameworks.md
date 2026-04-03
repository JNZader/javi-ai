# LLM Evaluation — Frameworks and Statistical Methods

## A/B Testing with Statistical Rigor

```python
import numpy as np
from scipy import stats
from dataclasses import dataclass


@dataclass
class ABTestResult:
    metric: str
    mean_a: float
    mean_b: float
    difference: float
    p_value: float
    cohens_d: float
    significant: bool
    recommendation: str


def ab_test_prompts(
    scores_a: list[float],
    scores_b: list[float],
    metric_name: str = "quality",
    alpha: float = 0.05,
    min_effect_size: float = 0.2,
) -> ABTestResult:
    """Run a rigorous A/B test between two prompt variants.

    Args:
        scores_a: Scores from prompt variant A.
        scores_b: Scores from prompt variant B.
        metric_name: Name of the metric being compared.
        alpha: Significance level (default 0.05).
        min_effect_size: Minimum Cohen's d to consider practically significant.
    """
    a, b = np.array(scores_a), np.array(scores_b)

    # Welch's t-test (does not assume equal variances)
    t_stat, p_value = stats.ttest_ind(a, b, equal_var=False)

    # Cohen's d - practical effect size
    pooled_std = np.sqrt((a.std() ** 2 + b.std() ** 2) / 2)
    cohens_d = (b.mean() - a.mean()) / pooled_std if pooled_std > 0 else 0.0

    # Decision logic: must be BOTH statistically AND practically significant
    statistically_sig = p_value < alpha
    practically_sig = abs(cohens_d) >= min_effect_size

    if statistically_sig and practically_sig:
        winner = "B" if cohens_d > 0 else "A"
        recommendation = f"Switch to variant {winner} (p={p_value:.4f}, d={cohens_d:.2f})"
    elif statistically_sig and not practically_sig:
        recommendation = f"Statistically significant but effect too small (d={cohens_d:.2f}). Keep current."
    else:
        recommendation = f"No significant difference (p={p_value:.4f}). Keep current or collect more data."

    return ABTestResult(
        metric=metric_name,
        mean_a=float(a.mean()),
        mean_b=float(b.mean()),
        difference=float(b.mean() - a.mean()),
        p_value=float(p_value),
        cohens_d=float(cohens_d),
        significant=statistically_sig and practically_sig,
        recommendation=recommendation,
    )
```

## Regression Detection

```python
from datetime import datetime


def detect_regression(
    current_scores: list[float],
    baseline_scores: list[float],
    threshold: float = 0.1,
    metric_name: str = "quality",
) -> dict:
    """Detect if a prompt change caused a regression.

    Uses one-sided t-test: is the new version significantly WORSE?
    """
    current = np.array(current_scores)
    baseline = np.array(baseline_scores)

    # One-sided test: H0: current >= baseline, H1: current < baseline
    t_stat, p_value_two = stats.ttest_ind(current, baseline, equal_var=False)
    p_value = p_value_two / 2 if t_stat < 0 else 1 - p_value_two / 2

    mean_diff = float(current.mean() - baseline.mean())
    pct_change = mean_diff / baseline.mean() * 100 if baseline.mean() != 0 else 0

    regression_detected = p_value < 0.05 and pct_change < -threshold * 100

    return {
        "metric": metric_name,
        "baseline_mean": float(baseline.mean()),
        "current_mean": float(current.mean()),
        "pct_change": round(pct_change, 2),
        "p_value": float(p_value),
        "regression_detected": regression_detected,
        "timestamp": datetime.now().isoformat(),
    }
```

## LangSmith Integration

```python
from langsmith import Client, traceable
from langsmith.evaluation import evaluate


# Initialize client (uses LANGSMITH_API_KEY env var)
ls_client = Client()

# Wrap any function for tracing
@traceable(name="my-llm-pipeline")
def run_pipeline(question: str) -> str:
    """Your LLM pipeline - automatically traced in LangSmith."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": question}],
    )
    return response.content[0].text


# Create a dataset for systematic evaluation
def create_eval_dataset(name: str, examples: list[dict]) -> None:
    """Create or update a LangSmith dataset.

    examples: [{"input": {"question": "..."}, "output": {"answer": "..."}}, ...]
    """
    dataset = ls_client.create_dataset(dataset_name=name)
    for ex in examples:
        ls_client.create_example(
            inputs=ex["input"],
            outputs=ex.get("output"),
            dataset_id=dataset.id,
        )


# Run evaluation over a dataset
def run_evaluation(dataset_name: str) -> None:
    """Run the pipeline against a LangSmith dataset with evaluators."""

    def accuracy_evaluator(run, example) -> dict:
        predicted = run.outputs.get("output", "")
        expected = example.outputs.get("answer", "")
        score = 1.0 if expected.lower() in predicted.lower() else 0.0
        return {"key": "accuracy", "score": score}

    results = evaluate(
        run_pipeline,
        data=dataset_name,
        evaluators=[accuracy_evaluator],
        experiment_prefix="eval-v1",
    )
    print(f"Results: {results}")
```

## Building an Eval Pipeline

```python
from dataclasses import dataclass, field
from pathlib import Path
import json


@dataclass
class EvalCase:
    question: str
    expected_answer: str | None = None
    expected_facts: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)


@dataclass
class EvalSuite:
    name: str
    cases: list[EvalCase]

    @classmethod
    def from_jsonl(cls, path: str | Path, name: str = "default") -> "EvalSuite":
        cases = []
        with open(path) as f:
            for line in f:
                cases.append(EvalCase(**json.loads(line)))
        return cls(name=name, cases=cases)

    def run(self, pipeline_fn, evaluators: list) -> dict:
        """Run all cases through pipeline and evaluators."""
        results = []
        for case in self.cases:
            output = pipeline_fn(case.question)
            scores = {}
            for evaluator in evaluators:
                scores.update(evaluator(output, case))
            results.append({"case": case.question, "output": output, "scores": scores})

        # Aggregate
        all_metrics = {}
        for key in results[0]["scores"]:
            values = [r["scores"][key] for r in results if isinstance(r["scores"].get(key), (int, float))]
            if values:
                all_metrics[key] = {
                    "mean": np.mean(values),
                    "std": np.std(values),
                    "min": min(values),
                    "max": max(values),
                }

        return {"individual": results, "aggregate": all_metrics}
```
