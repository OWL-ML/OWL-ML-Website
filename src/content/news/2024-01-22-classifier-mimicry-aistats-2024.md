---
date: 2024-01-22
type: paper
title: "Our paper \"Deep Classifier Mimicry without Data Access\" got accepted at AISTATS 2024 as an oral presentation"
paper: braun2024mimicry
migrated_from: https://owl-ml.com/our-paper-deep-classifier-mimicry-without-data-access-got-accepted-at-aistats-2024-as-an-oral-presentation/
---
Our paper "_Deep Classifier Mimicry without Data Access_" got accepted at the _International Conference on Artificial Intelligence and Statistics_ (AISTATS) 2024. We are honored to have been selected for an _oral_ presentation!

In the paper, we present a method for data-free and model-agnostic knowledge distillation. The essence of knowledge distillation is to train a model from scratch to mimic an already trained one, i.e. extract its knowledge. When we speak of data-free knowledge distillation, we mean that we do not rely on having access to any original or real data at all, that is we do not know what the model was trained on, only what it was trained for. When we speak of model-agnostic knowledge distillation, we mean we also don't assume the model to follow a particular structure, so we do not craft solutions by e.g. mimicking a specific internal layer or accessing its representations. We show that for classifiers, we can create such a knowledge distillation process through diffusion and contrastive learning. We call the respective method CAKE: contrastive abductive knowledge extraction. In summary, we diffuse pairs of random synthetic noise examples to attract each other until they just barely fall on two different sides of a decision boundary. Colloquially speaking, we try to empirically "cover" the decision boundary as closely as possible, without the need to mirror the original training data distribution.

For more information, [read the full paper](https://arxiv.org/abs/2306.02090).
