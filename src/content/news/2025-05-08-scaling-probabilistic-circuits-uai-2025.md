---
date: 2025-05-08
type: paper
title: "Our paper \"Scaling Probabilistic Circuits via Data Partitioning\" got accepted at UAI 2025"
paper: seng2025scaling
migrated_from: https://owl-ml.com/our-paper-scaling-probabilistic-circuits-via-data-partitioning-got-accepted-at-uai-2025/
---
Our work "Scaling Probabilistic Circuits via Data Partitioning" has just been accepted at the 41st Conference on Uncertainty in Artificial Intelligence Conference (UAI). Congratulations to first-author Jonas Seng and all co-authors!

In the paper we provide a unified framework for federated learning across different settings of heterogeneous data. To this end, we introduce federated circuits to bridge horizontal (clients' data distributions differ), vertical (clients hold different features), and hybrid (both of the former) federated learning. Federated circuits reframe the federated learning problem as aggregation of distributions learned by each client on its data partition, rather than aggregation of model parameters. In an instantiation using probabilistic circuits, we show that sum nodes help us address horizontal federated settings through mixture distributions, whereas vertical federated settings are addressed through mixtures of products of independent clusters. Check out the full paper for the precise framework, training algorithm, and application examples on images and tabular datasets (based on credit fraud and breast cancer detection)

For more information, [read the full paper](https://arxiv.org/pdf/2503.08141).
