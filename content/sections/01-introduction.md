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

{% comment "10/14 meeting" %}
put an eye-catching video on the top
{% endcomment %}


The broad knowledge and reasoning capabilities of large language models (LLMs) and vision-language models (VLMs) have motivated growing efforts to leverage these models in building generalist robots that can handle diverse tasks. 
One direction trains vision-language-action (VLA) models on robot data to predict actions directly, which requires substantial data. 
Another direction prompts general-purpose models to interact with robots, often using them to produce high-level plans that separate controllers then execute. Code as Policies (CaP) goes further by letting models generate executable control programs, yet its performance is still limited by hand-designed perception and control APIs.

Astra points to another possibility: recent community demonstrations and evaluations suggest that an off-the-shelf general-purpose model can connect task reasoning with motion decisions by selecting numerical robot actions directly from observations. 
If reliable, this capability could combine the prompt-based flexibility of general-purpose models with direct action generation, reducing the need for both robot-specific training and hand-designed control abstractions.

To test this potential, we evaluate Astra’s zero-shot performance on **meaningful household tasks** with the Hello Robot Stretch 4 mobile manipulator, asking the model to specify relative joint and base movements directly. 
Across task evaluations, case studies, and ablations, we characterize the **capabilities** and **limitations** of this approach and examine how **different design choices** shape its robot-control performance.
