---
nav: Case Study and Ablations
---

{% comment "Felix" %}
not sure if 'case study' is appropriate
{% endcomment %}

## Case Study and Ablations

{% raw %}
<!-- Extra setup notes, extra rollouts, hardware tables.

### Hardware

| Item | Details |
| --- | --- |
| Robot |  |
| Cameras |  |
-->

{% endraw %}

In this section, we provide a detailed case study of Astra autonomously controlling the robot to toast a bagel. To successfully complete the task, the robot must: (1) open the oven lid, (2) pick up the bread from the table and place it into the oven, (3) close the lid, and (4) rotate the knob to turn on the oven. This task is nontrivial, as it requires Astra to plan a sequence of actions, manipulate articulated objects, precisely place an items within a cluttered space, and carefully rotate a small knob.

{% video "/media/videos/case-study.mp4", "Demonstration of a successful rollout using the default configuration." %}

We performed ablation studies on this task to evaluate the impact of various design choices and system components listed in {% tabref "ablation-settings" %}. In each ablation, only the component under investigation is changed, while all others remain at their default values. Note that these are empirical observations from our runs and are not intended to represent statistically significant results.

{% table "Default configuration and ablation variants.", "ablation-settings" %}
| Setting                 | Default                                             | Variants Tested                                 |
|-------------------------|-----------------------------------------------------|-------------------------------------------------|
| Reasoning effort        | high                                                | low, ultra                         |
| Cameras                 | All cameras (head left + head center + head right + wrist) | head center + wrist |
| Wrist depth             | API for Astra to query depths from image coordinates| Color-mapped depth image; no depth                        |
| Proprioception          | On                                                  | Off                                               |
| Execution feedback      | On                                                  | Off                                               |
| Embodiment description  | On                                                  | Off                                             |
{% endtable %}

{% comment "Felix" %}
at least one more ablation (execution feedback > embodiment description > proprioception > cameras)
{% endcomment %}

### Reasoning level

We evaluated Astra's performance at three reasoning levels: `low`, `high` (default), and `ultra`, comparing task metrics as shown in {% figref "ablation-reasoning" %}. Our main findings are:

- Lowering the reasoning level from `high` to `low` reduced both the success rate and completion rate. With `low` reasoning, Astra frequently forgot or omitted important steps, such as closing the lid before setting the oven temperature. In one instance, it dropped the bread onto the robot base, causing the human operator to end the episode.

- Raising the reasoning level from `high` to `ultra` did not lead to better performance. Notably, in one `high`-level run, the robot was unable to properly pick up the bread, failed to place it inside the oven, and ultimately caused a severe collision that required human intervention. While such failures were rare, when they did occur, Astra often [struggled to reason about dependencies across steps](04-weaknesses.md#fails-to-reason-about-dependencies-across-steps) and could not recover. In practice, we found that `high` and `ultra` reasoning levels performed similarly.

- Interestingly, adjusting the reasoning level had little impact on inference time or token usage.

In summary, we observed no systematic benefit to increasing reasoning above the default `high` setting, while lowering it degraded performance on this task.

{% plotly "/media/figures/ablation-reasoning.json", "The `low` reasoning level performed worse and required more Codex turns compared to `high` and `ultra`. Increasing the reasoning level from `high` to `ultra` did not yield noticeable differences in any aspect.", "ablation-reasoning" %}

### Wrist depth

We evaluated three configurations for providing wrist depth information: (1) no depth input, (2) a color-mapped depth image, and (3) an API allowing Astra to query depth at specific image coordinates (the default setting). The task metrics are shown in {% figref "ablation-depth" %}, and our main findings are as follows:

- Omitting depth information resulted in similar overall performance but required more Codex turns, greater total time, and increased token usage. Without access to depth data, Astra had to estimate distances from RGB images alone, which led to wasted turns, time, and tokens on empty reaching and grasping. However, Astra consistently retried and recovered from these failures, resulting in comparable success and completion rates overall.

- Providing a color-mapped depth image produced the weakest performance. We suspect this is because the colorized depth image is not perfectly aligned with the RGB image, unlike the API option where each pixel directly corresponds to a depth value. As a result, the additional information was not only unhelpful but may have distracted Astra and degraded its effectiveness.

{% plotly "/media/figures/ablation-depth.json", "Effect of depth information.", "ablation-depth" %}

<!-- This section combines task comparisons with observations from developing the action interface. For the coffee, folding, toy clean-up, and pouring comparisons, our default configuration sends the gripper and head-center camera images, joint state, and the result of the previous command to Astra on every turn. Astra returns one relative joint command per turn, and reasoning effort is set to low. Between episodes we change one or two settings:

- **Embodiment information** adds a description of the Stretch 4, where each camera looks, and the robot and gripper URDF to the prompt.
- **Depth** adds a colorized depth image from the gripper camera.
- **Action chunking (H/K)** has Astra predict *H* waypoints per turn, of which the robot executes the first *K* before the next observation. Our chunked runs use 4/2.

Each episode in these comparisons was watched end to end, and the tables summarize what Astra did, where the operator had to step in, and how the episode ended.

{% callout "A note on what these results can and cannot show" %}
We ran between 3 and 7 episodes per task for the four task comparisons. Scenes and settings changed between episodes, and some settings were changed together, so most configurations were run only once or twice. The additional action-schema and dishwasher observations are exploratory. These case studies describe <strong>what Astra did in the observed runs</strong>. They are not statistically significant comparisons, and a difference between two episodes may be due to chance as much as to the setting we changed.
{% endcallout %}

### Debugging the action interface

Comparing Astra's reported explanations with its numerical commands revealed mismatches in axis selection and sign. Astra sometimes described an intention to move left but selected `base_x`, which our interface used for forward and backward movement. It also returned a negative value for a movement intended to go left where the interface required a positive one.

We revised the action schema to use movement-oriented names such as **`forward` and `slide`**, replacing coordinate-style names such as `base_x` and `base_y`. With the revised schema, Astra **opened both cabinet doors under the sink**.

Requesting explanations added little noticeable response latency in our runs and made these command errors easier to diagnose. Their practical value as a debugging aid makes this feature worth retaining.

### Make coffee

The robot starts in the kitchen with a drawer of coffee pods open, a Keurig on the counter, and a cup within view. The instruction is simply *"Make coffee."* To succeed, it has to put a pod in the machine, close the lid, place a cup under the spout, and press the brew button. In later episodes we made the scene harder on purpose. We added punctured (already used) pods next to unused ones, moved the Keurig to a tighter spot between the sink and the microwave, and placed a second cup in the sink.

{% figureGrid 2 %}
{% figure "/media/images/coffee-03-insert-pod.jpg", "Inserting the pod into the Keurig." %}
{% figure "/media/images/coffee-05-place-cup.jpg", "Placing the cup under the spout." %}
{% endfigureGrid %}

**At a glance:** 7 episodes. No episode completed every step cleanly without help. The operator stepped in during 4 episodes. There was 1 false success declaration and 2 outright failures, and the pod was not fully seated in any of the first 6 episodes.

| Episode | Change from default | What happened | Outcome |
| --- | --- | --- | --- |
| 1 | None | Planned pod → lid → cup → button, and worked through it in that order | Full sequence attempted; pod not fully seated |
| 2 | One pod punctured; gripper camera starts lower | Fetched the cup first, then the pod. **Skipped the punctured pod** and chose a better angle for dropping the pod in. Struck the lid twice while raising the arm, and needed many tries to align with the brew button | Button pressed, **with intervention** (operator closed the lid to protect the gripper) |
| 3 | Keurig moved between sink and microwave; one cup in the sink, one on the counter; two punctured pods and one unused pod | First settled on a cup stowed in a cabinet (likely out of reach), then switched to the cup **in the sink**. Scraped the bottom of the sink, so the operator paused it and moved the arm back. It then tried the counter cup and knocked it off the counter | **Failure** (*"Stopping after gripper failure"*) |
| 4 | Same scene, one cup directly in front | Initially turned the gripper to face the robot, then corrected. Picked the cup, placed it at the Keurig, and moved away | **False success** (*"DONE - Stopping with tilted cup"*) |
| 5 | Same as 4 | **Picked a punctured pod**, but correctly ignored pod-like objects outside the drawer. Deformed the pod so it could not be pushed in, and the operator pushed it down. Failed to close the lid twice. Pinched the cup from above, hit the Keurig while placing it, and the cup fell | **Failure** (operator stopped the episode) |
| 6 | + embodiment, + depth | Dropped the cup, then **picked it up again on the first try**. Placed it under the spout on the second attempt. The pod drawer slid shut and the operator re-opened it. Then **seated the pod and closed the lid** | Most complete run; one scene reset by the operator |
| 7 | + embodiment, + depth | **Re-opened the drawer** after it slid shut, placed the cup in one motion, and **rotated a pod** that was facing the wrong way. However, it also deformed a pod, kept returning to the same few gripper poses, pushed the Keurig backward, and pressed the gripper hard against the drawer | Partial; **safety concerns** |

The coffee task shows Astra at its most impressive and its most limited within a single episode. The **plan was right almost every time**. Astra knew the steps, tolerated changes in their order, and frequently made the right semantic choice about which pod or cup to use. Where it failed was in the **last few centimeters**: seating a pod, closing a lid, aligning with a button, and moving up without hitting the machine. The run with **embodiment and depth** turned on (episode 6) was the most complete. It recovered from a dropped cup and a mis-placed cup, then finished the pod and lid steps cleanly. Episode 7 used the same settings and still contacted the machine and the drawer. These two inputs may help with manipulation, but they are **not a fix for spatial awareness**.

These observations should be read with care. Seven episodes, run under changing scenes and settings, do not make a statistical result. The behaviors we highlight elsewhere in this post (skipping a used pod, recovering a dropped cup, re-opening the right drawer) each happened **once**. They show what Astra *can* do, not how reliably it does it. Nor do they show that Astra has some higher-order understanding of making coffee. The same episodes are just as consistent with a model that is very good at matching familiar patterns from its training data. Telling these explanations apart would take many more episodes per setting, run on a fixed scene.

### Fold clothes

A hoodie is laid out flat on a table in front of the robot, and the instruction is simply *"Fold my clothes."* In the last episode we replaced it with a pillowcase, since a square piece of fabric should in principle be easier to fold.

{% figureGrid 2 %}
{% figure "/media/images/fold-hoodie-1.jpg", "Fold clothes: Astra grasping the hoodie laid flat on the table." %}
{% figure "/media/images/fold-hoodie-2.jpg", "A later moment in the same task." %}
{% endfigureGrid %}

**At a glance:** 3 episodes: 1 failure, 1 with clearly better grasping, and 1 inconclusive.

| Episode | Change from default | What happened | Outcome |
| --- | --- | --- | --- |
| 1 | None (embodiment and depth off) | Grasping noticeably worse: closed the gripper when nowhere near the fabric and **missed the hem** several times. Spent about **twenty minutes** trying to fold the bottom upward | **Failure** |
| 2 | + embodiment, + depth | **Much better at picking and placing** the fabric | Clear improvement in grasping |
| 3 | + embodiment, + depth; pillowcase instead of hoodie | The pillowcase ended up on the floor; this may have been a setup problem | Inconclusive |

Folding gave the clearest sign that **embodiment and depth can matter**. In the episode without them, Astra could not reliably get its fingers onto the fabric. In the episode with them, its grasps were noticeably better. This is one episode each, so we read it as a promising sign, not a measured effect. It also fits the explanation in [Weaknesses](#weaknesses): grasping thin fabric on a table depends on judging height to within millimeters, which is exactly what depth provides. Deformable objects are still hard, though. A fold requires holding an edge, moving it along a path, and releasing it at the right spot, and every one of those steps is a fine-grained manipulation problem.

### Toy clean-up

Toys, including blocks, a toy drill, and a toy wrench, are scattered on the floor of the play area, and the instruction is simply *"Clean up the play area."* This task needs the most driving of the four. Astra has to find each toy, drive to it, pick it up, carry it to a box, and avoid the dresser and the toy drawer.

**At a glance:** 4 episodes: 2 successes (one with collisions), 1 completed with operator help, and 1 failure.

| Episode | Change from default | What happened | Outcome |
| --- | --- | --- | --- |
| 1 | None | Failed to pick up many toys, **crashed into the dresser**, drove over toys, and did not group the blocks together | **Failure** |
| 2 | + action chunking (4/2) | **Much faster and smoother**: backing up, retracting the arm, and opening the gripper followed one another so quickly that they looked like one motion, and it appeared to steer around toys. It **picked up every toy** and said `done` at the right time. However, it was **banging into the toy drawer** and moving erratically | **Success**, with collisions |
| 3 | 4/2 + embodiment; robot starts on the bedroom side for more clearance | The toy drill took four or five tries. **Sorted by type** (blocks with blocks). Dropped the blue wrench on the floor, and the operator placed it in the box. Performance seemed to degrade as the episode went on | Completed **with intervention** |
| 4 | 4/2 + embodiment + depth; toy drill removed from the scene | Cleaned up the play area | **Success** |

Action chunking had the largest effect here. Executing two predicted waypoints per turn made the robot's motion **noticeably more fluid and the episode much quicker**. We think this is mainly because the second waypoint runs immediately after the first, with no pause for a new model turn in between, so consecutive motions blend together. We have not yet confirmed from the logs whether the joints also moved at the same time. The cost was **safety**. The chunked runs hit the toy drawer harder and more often, which fits with Astra committing to several moves before it sees their effect. We suspect the lack of nearby-obstacle sensing (the Stretch's line sensors are not given to the model) makes this worse. For that reason, we would not use chunking on contact-heavy tasks like making coffee or pouring until Astra handles clearance better.

### Pour water

A green cup of water and a pink bowl sit on the kitchen counter, and Astra is asked to pour the water from the cup into the bowl.

{% figure { src: "/media/images/pour-spill.jpg", caption: "After a pour: the bowl is in reach, but the water was released from high above it and pooled on the counter mat.", width: "55%" } %}

**At a glance:** 4 episodes, 3 with recorded results. None of the 3 poured the water cleanly into the bowl.

| Episode | Instruction | Change from default | What happened | Outcome |
| --- | --- | --- | --- | --- |
| 1 | "Pour the water in the green cup into the pink bowl" | None | Tilted the cup from the right side, but no water came out. It then moved to the left and poured from left to right, **from high above the bowl** | Water reached the bowl, with **heavy spillage** |
| 2 | "… without spilling" | + action chunking (4/2), + embodiment, + depth | **Poured while still moving** and missed the bowl, spilling more than in episode 1 despite starting with less water | **Failure** |
| 3 | "… without spilling" | None | Poured from too high again and **could not tell whether the cup was over the bowl** | **Failure**, worse than episode 1 |
| 4 | "… without spilling" | + embodiment, + depth | *(result to be added)* | *(to be added)* |

<!-- TODO(Ankit): fill in the pour episode 4 result. The notes also list episode ids c4198442… ("pickup part to place") and b903fd32… without a description. --

Pouring was the one task where our changes **did not help**. Adding "without spilling" to the instruction did not make Astra lower the cup before tilting it. Action chunking made pouring clearly worse, because the cup kept tilting while the base and arm were still moving. The underlying problem is the same **spatial judgment** gap we saw elsewhere: from the cameras it is given, Astra cannot reliably tell how high the cup is above the bowl, or whether it is over the bowl at all.

### Load a cup into the dishwasher

We asked Stretch to pick up a cup and load it into the dishwasher. The initial pickup was surprisingly difficult: Astra needed **roughly four or five retries**, both on the kitchen counter and on the table, and varied its grasp approach across attempts.

To examine the remaining steps, we started with the cup already in the gripper. From an initial pose facing the table, Astra **turned to locate the dishwasher** and rotated the arm and wrist to orient the cup with its **opening facing downward**.

The cup landed just outside the dishwasher on the first two placement attempts. On the third, Astra placed it over the rack's tines, with the tines inside the cup. This demonstrated active search and appropriate object orientation, while accurate placement remained difficult.

We also instructed Astra to move the base instead of continuing to extend the arm. **It changed its behavior and used the base.** This instruction specified a concrete movement strategy, and we tested it only once; its consistency and effects on other tasks remain untested.

### What the switches changed, across tasks

The table below summarizes the coffee, folding, toy clean-up, and pouring comparisons.

| Switch | Make coffee | Fold clothes | Toy clean-up | Pour water |
| --- | --- | --- | --- | --- |
| Embodiment + depth | Most complete run, but contacts with the machine remained | **Clearly better** grasping (one episode) | Success once depth was added on top of chunking + embodiment (drill removed) | No benefit when combined with chunking; episode 4 without chunking pending |
| Action chunking (4/2) | Not tested (safety concern) | Not tested | **Much faster and smoother**, more collisions | **Worse**: poured while moving |
| Instruction wording ("without spilling") | — | — | — | No visible benefit |

With the caveats above in mind, two patterns stand out in these four comparisons. First, telling Astra **what body it is controlling** (embodiment information) and **how far away things are** (depth) went along with better **manipulation** in some episodes. Contacts still occurred. Second, **action chunking made motion faster and smoother, but also brought more contact in our runs**. The additional schema and dishwasher observations suggest that how we describe actions can matter too. The next step is to test these effects with more episodes per configuration and with **one switch changed at a time**. -->
