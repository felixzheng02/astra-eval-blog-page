---
nav: Weaknesses
---

## Weaknesses

{% raw %}
<!-- Markdown tables work as-is. Figures live in media/images/.

{% figure "/media/images/overview.png", "Figure caption" %}

{% figureGrid 2 %}
{% figure "/media/images/left.png", "Left" %}
{% figure "/media/images/right.png", "Right" %}
{% endfigureGrid %}

| Instruction | Success rate | Behavior |
| --- | --- | --- |
| "task A" |  |  |
| "task B" |  |  |
-->
{% endraw %}

Although Astra demonstrated impressive capabilities, our experiments also revealed recurring limitations. Most of the failures we saw were not isolated or random. In the following sections, we group these failure modes by theme, describe the behaviors we observed, and discuss the factors that may have contributed to them.

### Fine-grained manipulation

We found that Astra struggles with fine-grained manipulation: contact-rich actions in which millimeter-scale errors in pose or small differences in grip force can determine success. It has particular difficulty in confined spaces, where limited clearance makes it easy for the gripper or the object being manipulated to become wedged against the surroundings. Three factors appear to contribute to this. 
First, Stretch has no force feedback, so Astra must infer contact from images alone. 
Second, the wrist camera is often the only view that provides enough detail for precise manipulation, yet its view of the relevant contact point or surrounding clearance is frequently occluded by the gripper or the object itself. Additionally, the telescopic arm frequently occludes the center head camera’s view of the workspace, further limiting the visual information available for precise manipulation.
Third, Astra often fails to exhibit what Andy Zeng calls ["physical commonsense"](https://generalistai.com/blog/physical-commonsense): the reactive, closed-loop intuition for forces, friction, compliance, and uncertainty that supports small corrections during manipulation.

{% videoGrid 2 %}
{% video "/media/videos/make-coffee.mp4", "Instruction: `Make coffee.`; While Astra understood the high-level steps and demonstrated the correct motion intentions, it struggled with this task. For example, Astra accidentally closed the lid again after opening it, and during the final step, pressed too hard, causing the coffee machine to tilt and the cup to fall. We also found Astra generally unable to insert the coffee pod into the slot; this was the only successful attempt among our trials." %}
{% video "/media/videos/insert-toys.mp4", "Instruction: `Put the shapes in the box.`; Due to the minimal clearance in each slot, Astra was unable to insert the toy." %}
{% endvideoGrid %}

### Fails to reason about dependencies across steps

Astra struggles to reason about dependencies across steps. It often fails to anticipate how the execution of an earlier action will affect later ones. When a later step becomes difficult, it tends to treat the problem in isolation rather than trace it back to an earlier decision and revise that decision. As a result, it may repeatedly try alternative approaches to the current step even when the problem can only be resolved by revisiting a previous one. This differs from its ability to [recover from failures within the current step](#failure-recovery), where trying a different approach can resolve the problem.

{% videoGrid 2 %}
{% video "/media/videos/load-mug.mp4", "Instruction: `Load the mug in the dishwasher, facing down.`; We deliberately placed the mug inside a bowl, requiring Astra to grasp it from above, which later made placing the mug upside down impossible. Astra did not recognize that its initial grasp would prevent the correct placement; ideally, it should have set the mug down and re-grasped it in a more suitable orientation." %}
{% video "/media/videos/stack-bottle-on-cup.mp4", "Instruction: `Stack the bottled water on top of the cup.`; To keep the cup visible to the wrist camera during stacking, the robot must begin with a top-down grasp on the bottle. Astra repeatedly failed to foresee this necessity." %}
{% endvideoGrid %}

### Scene awareness and collisions

Astra often lacked sufficient awareness of its surroundings and spatial context during task execution. As a result, it frequently made unintended contact with objects in the environment, especially those that were not the current target or directly involved in the immediate step. These collisions included bumping into nearby furniture, appliances, or other obstacles that were outside its main focus of attention. Sometimes operator interventions are required to prevent damage.

{% videoGrid 2 %}
{% video "/media/videos/collide-fridge.mp4", "Instruction: `Open the fridge.`; Astra proceeded directly to the fridge, disregarding obstacles on the ground." %}
{% video "/media/videos/collide-dishwasher.mp4", "Instruction: `Pick up the cup.`; While attempting to grasp the cup, the robot collided with the dishwasher." %}
{% endvideoGrid %}

<!-- 
### Time and token cost

{% comment "Felix" %}
need to get the numbers
{% endcomment %}

Astra's inference is both time- and token-intensive. Across all tasks and episodes, each Codex turn takes an average of ** seconds and consumes ** tokens. This amounts to ** tokens per minute of execution, with inference accounting for **% of the total runtime. -->
