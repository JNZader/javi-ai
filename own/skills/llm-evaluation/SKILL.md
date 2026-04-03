---
name: llm-evaluation
description: >
  Comprehensive LLM evaluation framework with automated metrics, LLM-as-Judge, and RAG evaluation.
  Trigger: When evaluating LLM outputs, building eval pipelines, comparing models, or measuring RAG quality.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.1"
---

## Core Principle

Never ship LLM features without evaluation. An untested prompt is a broken prompt you haven't found yet.

## Automated Metrics

### When to Use Each Metric

| Metric | Best For | Limitation |
|--------|----------|------------|
| BLEU | Translation, structured output | Penalizes paraphrasing |
| ROUGE | Summarization | Ignores semantic equivalence |
| BERTScore | General quality | Compute-heavy, model-dependent |
| Exact Match | Classification, extraction | No partial credit |
| Custom Regex | Format validation | Brittle to minor changes |

### Key Implementations

- **Text similarity**: BLEU (n-gram precision), ROUGE (reference recall), BERTScore (semantic embeddings)
- **Custom metrics**: format compliance (regex patterns), factual overlap (fact checklist against output)

## LLM-as-Judge Patterns

Three evaluation modes:

1. **Single output** — score on accuracy, completeness, clarity, conciseness (1-5 each)
2. **Pairwise comparison** — compare two responses head-to-head, run both orderings to reduce position bias
3. **Reference-based** — compare against gold standard for factual consistency, coverage, hallucination detection

Key rule: always run pairwise comparisons in BOTH orderings (A vs B, then B vs A) and check consistency.

> @reference references/code-examples.md — Load when implementing metrics, LLM-as-Judge prompts, or RAG evaluation functions

## RAG Evaluation

### Dimensions

Evaluate RAG pipelines on 4 independent axes:

1. **Context Relevance** — are retrieved contexts relevant to the question?
2. **Answer Faithfulness** — is the answer grounded in contexts (no hallucination)?
3. **Answer Relevance** — does the answer address the question?
4. **Context Utilization** — does the answer use available contexts effectively?

### Retrieval Metrics

- **Precision@k** — fraction of retrieved docs that are relevant
- **Recall@k** — fraction of relevant docs that were retrieved
- **MRR** — reciprocal rank of first relevant result
- **NDCG@k** — normalized discounted cumulative gain (rewards relevant docs at top)

Always evaluate retrieval and generation separately.

## A/B Testing and Regression Detection

### A/B Testing

Require BOTH statistical AND practical significance:
- **Statistical**: Welch's t-test, p < 0.05
- **Practical**: Cohen's d >= 0.2 (minimum meaningful effect size)
- A p-value alone is NOT enough to justify switching

### Regression Detection

Use one-sided t-test: is the new version significantly WORSE?
- H0: current >= baseline
- H1: current < baseline
- Flag regression only if p < 0.05 AND percentage drop exceeds threshold

> @reference references/frameworks.md — Load when implementing A/B tests, regression detection, LangSmith integration, or eval pipeline scaffolding

## Building an Eval Pipeline

Core components:

1. **EvalCase** — question + expected answer + expected facts + tags
2. **EvalSuite** — collection of cases, loaded from JSONL, run through pipeline + evaluators
3. **Aggregation** — mean, std, min, max per metric across all cases

### LangSmith Integration

- `@traceable` decorator for automatic tracing
- Create datasets with `create_example()`
- Run evaluations with custom evaluator functions
- Track experiments with `experiment_prefix`

## Best Practices

1. **Start with deterministic metrics first** — regex, exact match, format checks are fast and cheap
2. **Use LLM-as-Judge for subjective quality** — but always validate the judge with human annotations first
3. **Always check position bias** in pairwise comparisons — run both orderings
4. **Require both statistical AND practical significance** — a p-value alone is not enough (use Cohen's d)
5. **Build eval datasets incrementally** — add failure cases from production as you find them
6. **Version your eval datasets** — changes to evals are as impactful as changes to prompts
7. **Run evals in CI** — block deployments on regression detection
8. **Use at least 30 examples** per eval to get reliable statistics
9. **Separate retrieval eval from generation eval** in RAG systems
10. **Log everything** — you cannot evaluate what you did not record

## Common Pitfalls

- **Overfitting to evals**: if you tune prompts to maximize eval scores, the eval stops being meaningful. Use held-out test sets.
- **LLM-as-Judge bias**: Claude/GPT tend to prefer verbose, confident-sounding answers regardless of accuracy. Calibrate with human labels.
- **Small sample sizes**: 5-10 examples give unreliable means. Target 50+ for serious decisions.
- **Ignoring distribution**: means hide bimodal distributions. Always look at histograms.
- **Evaluating the wrong thing**: high BLEU with low user satisfaction means your metric is wrong, not your model.

## Keywords
llm evaluation, eval pipeline, bleu, rouge, bertscore, llm-as-judge, rag evaluation, a/b testing, regression detection, langsmith
