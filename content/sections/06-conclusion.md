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

We set out to see how far an off-the-shelf model can go when it directly controls a real **mobile manipulator** in a **household setting**, with no fine-tuning and no demonstrations. "Off-the-shelf" applies to the model, not to the system around it. Astra's output is a relative joint command, but everything it decides from comes through a **perception and sensing pipeline** we built around it. That pipeline delivers fresh gripper and head camera frames on every turn, an optional colorized depth image from the wrist, joint-state proprioception, feedback from the robot's executor on whether each command was accepted, rejected, or timed out, and an optional description of the robot's body and its URDF. We found that what Astra could and could not do depended heavily on **what this pipeline let it see**.

Across making coffee, folding clothes, cleaning up toys, and pouring water, the picture has two sides.

On the **reasoning** side, Astra was often impressive. Given prompts as short as *"Make coffee"*, it broke the task into sensible steps without being told what they were. It made reasonable semantic choices, such as skipping a used coffee pod or sorting toys by type. It moved its own arm out of the way to see better, re-opened the correct drawer of four after it slid shut, and recovered from dropping a cup. Its motions also had the **right intent**, such as tilting a cup to pour.

On the **execution** side, the failures clustered around a few clear causes. Steps that depend on **contact and force**, such as seating a pod, closing a lid, or pinching fabric, failed when the deciding detail was hidden from the cameras or could only be felt. **Collisions** happened where obstacles fell outside every camera view or where the sideways-reaching arm swept through space. **Ending the task** was unreliable, partly because Astra had no way to report failure other than declaring `done`. Many of these failures say as much about **the task and the sensing** as about the model: a pod slot hidden behind the robot's own arm and viewed against a dark background would challenge any vision-only system.

Our ablations point to the inputs that matter. **Embodiment information and depth** went along with better grasping, but they did not prevent collisions. **Action chunking** made motion faster and smoother by removing the pause between consecutive moves, at the cost of more contact. **Rewording the instruction** did little on its own. All of these are early signals from a small number of episodes, and they need repeated, controlled trials before they become findings.

{% callout "Takeaway" %}
Astra often plans like a capable household assistant, but it does not yet move like one. In our runs, the gap came less from high-level reasoning and more from what the robot could sense: what the cameras could see, the absence of touch, and obstacles near the body that no sensor covered. Better sensing, a richer action interface, and a safety layer that does not rely on the model to avoid contact are the most promising next steps.
{% endcallout %}
