---
nav: Conclusion
---

## Conclusion

{% raw %}
<!-- Copy this file to content/sections/NN-name.md (next number, then rebuild).
     Set `nav` for the top bar. Heading becomes the on-page title.

Paragraphs go here.

{% videoGrid 2 %}
{% video "/media/videos/clip.mp4", "Caption" %}
{% youtube "xxxxxxxxxxx", "YouTube caption" %}
{% endvideoGrid %}

{% figure "/media/images/plot.png", "Figure caption" %}

{% callout "Note" %}
Optional callout.
{% endcallout %}

| Col A | Col B |
| --- | --- |
|  |  |
-->
{% endraw %}

<!-- We set out to see how far an off-the-shelf model can go when it directly controls a real **mobile manipulator** in a **household setting**, with no fine-tuning and no demonstrations. "Off-the-shelf" applies to the model, not to the system around it. Astra's output is a relative joint command, but everything it decides from comes through a **perception and sensing pipeline** we built around it. That pipeline delivers fresh gripper and head camera frames on every turn, an optional colorized depth image from the wrist, joint-state proprioception, feedback from the robot's executor on whether each command was accepted, rejected, or timed out, and an optional description of the robot's body and its URDF. Our observations suggest that performance depends on **what Astra can observe, how actions are described, and how the controller responds to contact**.

Across making coffee, folding clothes, cleaning up toys, pouring water, opening doors, and loading a cup into the dishwasher, the picture has two sides.

On the **reasoning** side, Astra was often impressive. Given prompts as short as *"Make coffee"*, it broke the task into sensible steps without being told what they were. It made reasonable semantic choices, such as skipping a used coffee pod or sorting toys by type. It moved its own arm out of the way to see better, re-opened the correct drawer of four after it slid shut, and recovered from dropping a cup. Its motions also had the **right intent**, such as tilting a cup to pour. With a cup already in its gripper, it searched for the dishwasher and oriented the cup downward, although accurate placement required multiple attempts.

On the **execution** side, the failures clustered around a few clear causes. Steps that depend on **contact and force**, such as seating a pod, closing a lid, or pinching fabric, failed when the deciding detail was hidden from the cameras or could only be felt. **Collisions** happened where obstacles fell outside every camera view or where the sideways-reaching arm swept through space. **Ending the task** was unreliable, partly because Astra had no way to report failure other than declaring `done`. Many of these failures say as much about **the task and the sensing** as about the model: a pod slot hidden behind the robot's own arm and viewed against a dark background would challenge any vision-only system.

Our task comparisons and development observations suggest several ways the surrounding system matters. **Embodiment information and depth** went along with better grasping, but they did not prevent collisions. **Action chunking** made motion faster and smoother by removing the pause between consecutive moves, at the cost of more contact. Asking Astra to pour **"without spilling"** did not visibly help; a concrete instruction to use the base instead of extending the arm changed its behavior in one dishwasher trial.

The **action interface** also mattered. Astra's reported explanations exposed axis and sign errors, and it opened both under-sink cabinet doors after we introduced clearer movement names. A **force-threshold guard** added an automatic controller response, reversing actions when contact exceeded a joint's threshold.

{% callout "Takeaway" %}
Astra often plans like a capable household assistant, but precise, reliable execution remains difficult. Our runs point to three priorities: better observations for judging distance and contact, action descriptions the model can map consistently to movements, and controller safeguards that respond independently of the model.
{% endcallout %} -->
