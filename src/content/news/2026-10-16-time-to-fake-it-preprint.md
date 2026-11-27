---
date: 2026-10-16
type: paper
title: "New preprint: Time to Fake It: Continual Machine Learning Intensifies Unfairness in Deepfake Detection"
paper: das2026timetofakeit
---
Our new preprint "[Time to Fake It: Continual Machine Learning Intensifies Unfairness in Deepfake Detection](https://arxiv.org/abs/2610.21974)" is now online.

Deepfake detectors safeguard against misinformation, rendering their failures as much a societal as a technical concern. As generators constantly evolve, detectors trained on static datasets miss newly arising threats, while progressive training interferes catastrophically. Yet, mitigating forgetfulness in terms of accuracy, the prevalent focus of continual learning (CL), is insufficient to reflect real-world impact. We therefore scrutinize the effects of CL methods with respect to evolving fairness. To this end, we analyze four dimensions of fairness across diverse demographics for detectors trained progressively on a chronological sequence of 11 real-world deepfake generation methods. Tracking fairness metrics over time, we expose non-trivial interplays between performance and fairness that depend on both the choice of CL algorithm and demographic intersections. We find accuracy degradation to typically exacerbate unfairness and, conversely, fairness improvements to remain scarce over time. Dissecting the CL method families (rehearsal, prompts, regularization), we observe that inequitable forgetting is not explained by underrepresentation alone, but likely entangled with representation learning. We thus issue a call to action for CL methods to take social outcomes into account when balancing the stability-plasticity tradeoff.

The code is on [GitHub](https://github.com/OWL-ML/time-to-fake-it). For more information, [read the full paper](https://arxiv.org/abs/2610.21974).
