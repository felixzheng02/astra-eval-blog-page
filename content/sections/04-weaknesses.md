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

### Fine-grained manipulation

Across both tasks, the failures concentrate in contact-rich steps, where the end-effector has to reach a precise pose or handle an object with the right grip. Astra's plan for these steps is sensible. The low-level execution is imprecise.

#### Approach and pre-grasp alignment

*"Grab the apple from the kitchen and bring it to the couch."*

Positioning the gripper next to the apple took many attempts. Astra has no consistent approach strategy: it varies how it approaches from one attempt to the next, and the end-effector placement is imprecise.

#### Grasping

Grasping was the weakest primitive we tested. Astra does not appear to know where on the apple to grasp, and it does not regulate grip force: the gripper left marks on the apple. It also makes little use of visual feedback to verify the grasp. Failure is detected only at the lift stage, when it checks that the apple is still held after the arm retracts, and by then the apple has already dropped.

#### Deformable objects

*"Find the mobile phone under the pillow on the sofa."*

The pillow was a different problem from the apple. Its shape changes under the gripper, and it slipped out of the grasp on every attempt. Astra secured it only after many retries, and then tossed it aside instead of moving it deliberately.

#### Placement

*"Grab the apple from the kitchen and bring it to the couch."*

Placement is where the apple task failed. In two of three attempts the apple did not end up resting on the couch, and the run did not complete. Up to that point, grounding, localization, grasping and navigation had all worked, and Astra had already selected a placement location. We do not think this was a failure of task understanding, and we do not yet have a clear explanation for it.

Persistence seems to mask this imprecision when retries are free, as with the pillow, but not when a failed grasp has a physical cost, as with the dropped apple.

### Spatial reasoning

#### Placement-site selection

For the apple, Astra chose a placement location on the couch, but the location was suboptimal. It does not seem to apply a good criterion for what counts as a good enough spot.

#### Occlusion and partial observability

Target localization is reliable when the object is within the camera's field of view and degrades when it is occluded. The phone task is a different case, since the instruction itself told Astra where the occluder was.

### Awareness of side effects

Astra shows little awareness of how its motions affect nearby objects. Around the apple, it does not act as though the neighboring fruit is delicate or needs to be avoided. With the pillow, once it had a grasp, it threw the pillow aside with no regard for where it landed. That is harmless for a pillow, and arguably efficient, but it is the same behavior that would be a problem around fragile objects. In both cases the planning appears to consider only the target object, with no model of collateral effects.

### Latency

*"Grab the apple from the kitchen and bring it to the couch."*

After the apple dropped, Astra detected the failure but was slow to re-plan and resume. It does retry, so recovery itself is not the problem. The delay between detecting the failure and issuing the next corrective action is long.
