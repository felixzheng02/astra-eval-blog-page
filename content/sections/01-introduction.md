---
nav: Introduction
---

{% raw %}
<!-- Write intro paragraphs here. Inline math: $x$ or \(\pi_0\). Display math: $$...$$ or \[...\].

{% callout "Note" %}
Optional highlighted remark.
{% endcallout %}
-->

The broad knowledge and reasoning capabilities of large language models (LLMs) and vision-language models (VLMs) have motivated efforts to build generalist robots that can handle diverse tasks. These efforts include vision-language-action (VLA) models trained on robot data and systems that prompt general-purpose models to interact with robots. In prompted systems, high-level planning is a common role, while approaches such as Code as Policies (CaP) extend the model’s role to generating executable control programs. Recent community demonstrations and evaluations of Astra suggest that an off-the-shelf general-purpose model can connect task reasoning with motion decisions, selecting numerical robot actions from observations without task-specific fine-tuning. Motivated by this capability, we evaluate Astra’s zero-shot performance on **meaningful household tasks** using a **mobile manipulator** Hello Robot Stretch 4, with the model directly specifying relative joint and base movements. Through task evaluations, case studies, and ablations, we share insights into Astra’s **capabilities** and **limitations** and examine how **different design choices** affect its performance in robot control.
{% endraw %}
