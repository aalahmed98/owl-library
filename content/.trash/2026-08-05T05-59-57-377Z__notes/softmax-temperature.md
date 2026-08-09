---
title: Softmax Temperature — Notes
tags: [sampling, llm, fundamentals]
summary: How the temperature parameter reshapes a softmax distribution, with the math and a reference implementation.
created: 2026-08-03
updated: 2026-08-03
status: final
---

# Softmax Temperature

Temperature $T$ rescales logits before the softmax, controlling how peaked the resulting distribution is:

$$
p_i = \frac{\exp(z_i / T)}{\sum_j \exp(z_j / T)}
$$

- $T \to 0$: argmax — all mass on the largest logit.
- $T = 1$: the raw softmax distribution.
- $T \to \infty$: uniform — differences between logits vanish.

## Why it works

Dividing by $T$ scales the *gaps* between logits. The softmax ratio between two candidates is

$$
\frac{p_i}{p_j} = \exp\!\left(\frac{z_i - z_j}{T}\right)
$$

so temperature acts directly on log-odds: halving $T$ squares every pairwise odds ratio.

## Reference implementation

```python
import numpy as np

def softmax_t(logits: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    z = logits / max(temperature, 1e-8)
    z = z - z.max()          # numerical stability
    e = np.exp(z)
    return e / e.sum()
```

## See also

- The interactive companion: [Sampling Temperature Explorer](/doc/papers/sampling-temperature-explorer.html)
