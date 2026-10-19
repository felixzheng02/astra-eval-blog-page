---
nav: Introduction
---

{% raw %}
<!-- Write intro paragraphs here. Inline math: $x$ or \(\pi_0\). Display math: $$...$$ or \[...\].

{% callout "Note" %}
Optional highlighted remark.
{% endcallout %}

{% comment "Name" %}
Visible comment on the page.
{% endcomment %}
-->
{% endraw %}

{% comment "Felix" %}
TODOs:

- eye-catching video: plan to concatenate lots of robot execution clips and show it when people enters the webpage; scroll down to the blog.
- more citations in intro part; also make citation format formal

{% endcomment %}

<!-- The broad knowledge and reasoning capabilities of large language models (LLMs) and vision-language models (VLMs) have motivated growing efforts to leverage these models in building generalist robots that can handle diverse tasks. 
One direction trains vision-language-action (VLA) models on robot data to predict actions directly, which requires substantial data. 
Another direction prompts general-purpose models to interact with robots, often using them to produce high-level plans that are then executed in sequence by separate controllers. Code as Policies (CaP) goes further by letting models generate executable control programs, yet its performance is still limited by hand-designed perception and control APIs.

Astra points to another possibility: recent community demonstrations and evaluations suggest that an off-the-shelf, general-purpose model can connect task reasoning with motion decisions by selecting numerical robot actions directly from observations. 
If reliable, this capability could combine the prompt-based flexibility of general-purpose models with direct action generation, reducing the need for both robot-specific training and hand-designed control abstractions.

To test this potential, we evaluate Astra’s zero-shot performance on **meaningful household tasks** with the Hello Robot Stretch 4 mobile manipulator, asking the model to specify relative joint and base movements directly. 
Across task evaluations, case studies, and ablations, we characterize the **capabilities** and **limitations** of this approach and examine how **different design choices** shape its robot-control performance. -->

In September 2026, OpenAI released GPT-6 Astra ([OpenAI, 2026](https://openai.com/index/gpt-6-astra/)), a general-purpose multimodal model built for reasoning, software engineering, and task automation. Although not designed for robotics, Astra has been shown in evaluations to act as a capable robot policy with no task-specific training ([Zhang et al., 2026](https://arxiv.org/abs/2609.24170); [Yang et al., 2026](https://research.nvidia.com/labs/srl/projects/astranomy), [Jedlicki et al., 2026](https://arxiv.org/abs/2610.17350); [Galbot Team, 2026](https://arxiv.org/abs/2609.38537); [Robocurve, 2026](https://openai.robocurve.org/gpt-6-astra)).

Unlike established VLA- and VLM-based approaches, which rely on large-scale robot training data or hand-engineered interfaces, Astra issues actions directly from observations, with the action representation, horizon, and context specified in the prompt at inference time. 
VLA models such as RT-2 ([Brohan et al., 2023](https://arxiv.org/abs/2307.15818)), OpenVLA ([Kim et al., 2025](https://arxiv.org/abs/2406.09246)), and π0 ([Black et al., 2024](https://arxiv.org/abs/2410.24164)) fine-tune a pretrained backbone on robot demonstrations, fixing the action space and horizon at training time. 
VLM-based planners ([Ahn et al., 2022](https://arxiv.org/abs/2204.01691); [Driess et al., 2023](https://arxiv.org/abs/2303.03378)) select among predefined skills, which limits the robot to behaviors someone has already engineered, and Code as Policies ([Liang et al., 2023](https://arxiv.org/abs/2209.07753); [Fu et al., 2026](https://arxiv.org/abs/2603.22435v2)) writes control programs that can call only hand-designed perception and control APIs. 
Astra thus combines the direct control of VLAs with the zero-shot generality of prompted models. 
{% comment "Felix" %}
I think this sentence doesn't motivate our work; it also summarizes other people's results (also part of our results); I prefer something like "its reliability under real-world mobile manipulation settings is untested"
{% endcomment %}

Its reliability, however, varies widely across tasks: it handles simple pick-and-place well but struggles with precise, contact-rich manipulation [cite], and it is slow and expensive to query at control rates.

In this work, we evaluate Astra’s zero-shot performance on 24 household tasks using the Hello Robot Stretch 4 mobile manipulator, prompting the model to output relative joint and base movements directly. Through task evaluations, case studies, and ablations, we characterize the capabilities and limitations of this approach and examine how design choices shape its control performance.
