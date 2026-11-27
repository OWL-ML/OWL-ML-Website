---
date: 2022-10-04
type: paper
title: "\"Elevating Perceptual Sample Quality in Probabilistic Circuits through Differentiable Sampling\" paper out now in PMLR 181"
paper: lang2022elevating
migrated_from: https://owl-ml.com/elevating-perceptual-sample-quality-in-probabilistic-circuits-through-differentiable-sampling-out-now-in-pmlr/
---
Our formerly pre-registered paper called "Elevating Perceptual Sample Quality in Probabilistic Circuits through Differentiable Sampling" is finally out in the Proceedings of Machine Learning Research (PMLR), Volume 181, Pages 1-21.

The paper has started as part of the NeurIPS 2021 [Preregister Science Workshop](https://preregister.science), where the fundamental idea is to first write a paper proposal with all details on hypotheses, methodology, and an experimental protocol. This initial version of the paper then underwent double-blind peer-review with respect to relevance, novelty and correctness, before we spent several more months on following up rigorously on empirical experiments. The final paper version was then reviewed again, to check if we have thoroughly followed our own experimental protocol and have correctly described both negative and affirmative outcomes in terms of our original hypotheses.

From a content point of view, the central idea of the paper is to introduce differentiable sampling into probabilistic circuits (PCs). Equipping PCs with this capability, allows us to include loss functions beyond traditional log likelihood optimization. This in turn allows for the inclusion of different loss functions, such as those commonly employed in generative adversarial networks (GANs), maximum mean discrepancy (MMD) or Variational Autoencoders (VAEs). The key hypothesis was that such inclusion of loss functions from neural network counterparts, could boost the perceived sampling quality of PCs, which has traditionally been seen as sub-par. Whereas there is still plenty of room for improvement in terms of employing engineering tricks, our final results indicate that such loss functions are indeed feasibly for training of probabilistic circuits. Our work now enables plenty of exciting future directions!

Check out the [full paper](https://proceedings.mlr.press/v181/lang22a/lang22a.pdf) for more details.
