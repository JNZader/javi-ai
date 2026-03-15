---
name: llm-evaluation
description: >
  Comprehensive LLM evaluation framework with automated metrics, LLM-as-Judge, and RAG evaluation.
  Trigger: When evaluating LLM outputs, building eval pipelines, comparing models, or measuring RAG quality.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Core Principle

Never ship LLM features without evaluation. An untested prompt is a broken prompt you haven't found yet.

## Automated Metrics

### Text Similarity Metrics

```python
from rouge_score import rouge_scorer
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction
from bert_score import score as bert_score

def compute_text_metrics(prediction: str, reference: str) -> dict:
    """Compute BLEU, ROUGE, and BERTScore for a prediction against a reference."""
    # BLEU - measures n-gram precision (0-1, higher is better)
    smoothie = SmoothingFunction().method1
    bleu = sentence_bleu(
        [reference.split()],
        prediction.split(),
        smoothing_function=smoothie,
    )

    # ROUGE - measures recall of reference n-grams
    scorer = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=True)
    rouge = scorer.score(reference, prediction)

    # BERTScore - semantic similarity using contextual embeddings
    P, R, F1 = bert_score([prediction], [reference], lang="en", verbose=False)

    return {
        "bleu": bleu,
        "rouge1_f": rouge["rouge1"].fmeasure,
        "rouge2_f": rouge["rouge2"].fmeasure,
        "rougeL_f": rouge["rougeL"].fmeasure,
        "bertscore_f1": F1.item(),
    }
```

### When to Use Each Metric

| Metric | Best For | Limitation |
|--------|----------|------------|
| BLEU | Translation, structured output | Penalizes paraphrasing |
| ROUGE | Summarization | Ignores semantic equivalence |
| BERTScore | General quality | Compute-heavy, model-dependent |
| Exact Match | Classification, extraction | No partial credit |
| Custom Regex | Format validation | Brittle to minor changes |

### Custom Metrics

```python
import re

def format_compliance(output: str, expected_format: str) -> float:
    """Check if output matches expected format pattern."""
    patterns = {
        "json": r"^\s*\{.*\}\s*$",
        "bullet_list": r"^(\s*[-*]\s+.+\n?)+$",
        "numbered_list": r"^(\s*\d+\.\s+.+\n?)+$",
        "markdown_headers": r"^#+\s+.+",
    }
    pattern = patterns.get(expected_format, expected_format)
    return 1.0 if re.match(pattern, output, re.DOTALL) else 0.0


def factual_overlap(prediction: str, reference_facts: list[str]) -> float:
    """Fraction of reference facts mentioned in prediction."""
    prediction_lower = prediction.lower()
    found = sum(1 for fact in reference_facts if fact.lower() in prediction_lower)
    return found / len(reference_facts) if reference_facts else 0.0
```

## LLM-as-Judge Patterns

### Single Output Evaluation

```python
import anthropic

client = anthropic.Anthropic()

EVAL_PROMPT = """You are an expert evaluator. Score the following response on a scale of 1-5 for each criterion.

**Question:** {question}
**Response:** {response}

Evaluate on:
1. **Accuracy** (1-5): Are the facts correct?
2. **Completeness** (1-5): Does it address all parts of the question?
3. **Clarity** (1-5): Is it well-organized and easy to understand?
4. **Conciseness** (1-5): Is it appropriately brief without losing information?

Return ONLY valid JSON:
{{"accuracy": <int>, "completeness": <int>, "clarity": <int>, "conciseness": <int>, "reasoning": "<brief explanation>"}}"""


def llm_judge_single(question: str, response: str) -> dict:
    """Score a single LLM response using Claude as judge."""
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": EVAL_PROMPT.format(question=question, response=response),
        }],
    )
    import json
    return json.loads(message.content[0].text)
```

### Pairwise Comparison

```python
PAIRWISE_PROMPT = """You are an expert evaluator. Compare two responses to the same question.

**Question:** {question}
**Response A:** {response_a}
**Response B:** {response_b}

Which response is better? Consider accuracy, completeness, clarity, and usefulness.

Return ONLY valid JSON:
{{"winner": "A" | "B" | "tie", "reasoning": "<brief explanation>", "confidence": "high" | "medium" | "low"}}"""


def pairwise_compare(question: str, response_a: str, response_b: str) -> dict:
    """Compare two LLM responses head-to-head."""
    # Run both orderings to reduce position bias
    result_ab = _run_comparison(question, response_a, response_b)
    result_ba = _run_comparison(question, response_b, response_a)

    # Flip winner for reversed ordering
    flipped = {"A": "B", "B": "A", "tie": "tie"}
    result_ba["winner"] = flipped[result_ba["winner"]]

    # Check consistency
    if result_ab["winner"] == result_ba["winner"]:
        return {**result_ab, "consistent": True}
    return {"winner": "tie", "reasoning": "Inconsistent across orderings", "consistent": False}


def _run_comparison(question: str, resp_a: str, resp_b: str) -> dict:
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": PAIRWISE_PROMPT.format(
                question=question, response_a=resp_a, response_b=resp_b
            ),
        }],
    )
    import json
    return json.loads(message.content[0].text)
```

### Reference-Based Evaluation

```python
REFERENCE_EVAL_PROMPT = """You are an expert evaluator. Compare the response against a gold-standard reference.

**Question:** {question}
**Reference Answer:** {reference}
**Model Response:** {response}

Evaluate:
1. **Factual Consistency** (1-5): Does the response align with reference facts?
2. **Coverage** (1-5): What fraction of reference points are addressed?
3. **No Hallucination** (1-5): Does the response avoid stating things contradicted by or absent from the reference?

Return ONLY valid JSON:
{{"factual_consistency": <int>, "coverage": <int>, "no_hallucination": <int>, "missing_points": ["<point>"], "hallucinations": ["<claim>"]}}"""
```

## RAG Evaluation Metrics

### Context Relevance and Answer Faithfulness

```python
def evaluate_rag_response(
    question: str,
    answer: str,
    retrieved_contexts: list[str],
    ground_truth: str | None = None,
) -> dict:
    """Evaluate RAG pipeline quality across multiple dimensions."""

    eval_prompt = f"""Evaluate this RAG (Retrieval-Augmented Generation) response.

**Question:** {question}
**Retrieved Contexts:**
{chr(10).join(f"[{i+1}] {ctx}" for i, ctx in enumerate(retrieved_contexts))}
**Generated Answer:** {answer}
{f"**Ground Truth:** {ground_truth}" if ground_truth else ""}

Score each metric 1-5:
1. **Context Relevance**: Are the retrieved contexts relevant to the question?
2. **Answer Faithfulness**: Is the answer grounded in the retrieved contexts (no hallucination)?
3. **Answer Relevance**: Does the answer actually address the question?
4. **Context Utilization**: Does the answer make good use of the available contexts?
{f"5. **Correctness**: Does the answer match the ground truth?" if ground_truth else ""}

Return ONLY valid JSON:
{{"context_relevance": <int>, "faithfulness": <int>, "answer_relevance": <int>, "context_utilization": <int>{', "correctness": <int>' if ground_truth else ""}, "reasoning": "<explanation>"}}"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        messages=[{"role": "user", "content": eval_prompt}],
    )
    import json
    return json.loads(message.content[0].text)
```

### Retrieval Precision and Recall

```python
def retrieval_metrics(
    retrieved_doc_ids: list[str],
    relevant_doc_ids: list[str],
    k: int = 10,
) -> dict:
    """Compute retrieval quality metrics."""
    retrieved_set = set(retrieved_doc_ids[:k])
    relevant_set = set(relevant_doc_ids)

    hits = retrieved_set & relevant_set

    precision_at_k = len(hits) / k if k > 0 else 0.0
    recall_at_k = len(hits) / len(relevant_set) if relevant_set else 0.0

    # Mean Reciprocal Rank
    mrr = 0.0
    for i, doc_id in enumerate(retrieved_doc_ids[:k]):
        if doc_id in relevant_set:
            mrr = 1.0 / (i + 1)
            break

    # NDCG@k
    import math
    dcg = sum(
        1.0 / math.log2(i + 2)
        for i, doc_id in enumerate(retrieved_doc_ids[:k])
        if doc_id in relevant_set
    )
    ideal_dcg = sum(1.0 / math.log2(i + 2) for i in range(min(len(relevant_set), k)))
    ndcg = dcg / ideal_dcg if ideal_dcg > 0 else 0.0

    return {
        f"precision@{k}": precision_at_k,
        f"recall@{k}": recall_at_k,
        "mrr": mrr,
        f"ndcg@{k}": ndcg,
    }
```

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

## Best Practices

1. **Start with deterministic metrics first** - regex, exact match, format checks are fast and cheap
2. **Use LLM-as-Judge for subjective quality** - but always validate the judge with human annotations first
3. **Always check position bias** in pairwise comparisons - run both orderings
4. **Require both statistical AND practical significance** - a p-value alone is not enough (use Cohen's d)
5. **Build eval datasets incrementally** - add failure cases from production as you find them
6. **Version your eval datasets** - changes to evals are as impactful as changes to prompts
7. **Run evals in CI** - block deployments on regression detection
8. **Use at least 30 examples** per eval to get reliable statistics
9. **Separate retrieval eval from generation eval** in RAG systems
10. **Log everything** - you cannot evaluate what you did not record

## Common Pitfalls

- **Overfitting to evals**: if you tune prompts to maximize eval scores, the eval stops being meaningful. Use held-out test sets.
- **LLM-as-Judge bias**: Claude/GPT tend to prefer verbose, confident-sounding answers regardless of accuracy. Calibrate with human labels.
- **Small sample sizes**: 5-10 examples give unreliable means. Target 50+ for serious decisions.
- **Ignoring distribution**: means hide bimodal distributions. Always look at histograms.
- **Evaluating the wrong thing**: high BLEU with low user satisfaction means your metric is wrong, not your model.

## Keywords
llm evaluation, eval pipeline, bleu, rouge, bertscore, llm-as-judge, rag evaluation, a/b testing, regression detection, langsmith
