# LLM Evaluation — Code Examples

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

## RAG Evaluation

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
