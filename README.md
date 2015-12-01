# Project Heinzelmannchen

"Accelerate risk" is a common theme in managing complex research and development projects.  The idea sounds simple enough - identify the biggest risks and go after them first. Moving potentially existential risks to the beginning of the project is the best use of R&D dollars because, if it simply can't be done, you don't want to find that out at the end after burning through most of the budget. Even in the absence of existential risks it is still wise to move the biggest risks up from so that the team is always going "down hill" with the wind at their backs. If done corretly then the end of the project is relatively straight forward and everyone can reminisce about the pain behind them.

So the question, then, is how do you define risks? For us it comes down to dependencies between tasks, issues, bugs, etc.  If you have a piece of work and you know exactly how to do, it doesn't depend on completing any other piece of work, there is no integration work required, then that is not particularly risky.  Invert any one of those suppositions and suddenly there is a dependency you need to clear before you can declare success.

An alternative approach is to ask "how long do you think it will take you to complete X" where X is some piece of work. The longer the estimate the more risk.  The problem is that humans are epically horrible at estimating how long a piece of creative work will take. What is actually happening when a human is presented with a request for an estimate is they perform an on-the-fly dependency analysis and attempt to aggregate the cost estimate for each item in their ad-hoc depedendency graph.  They will tend to be more correct when they have done X many times before, know what all the dependencies are, and know how long it took to clear each depedency; in other words, very low risk.

![heinzelmannchen](https://cloud.githubusercontent.com/assets/1324391/11509558/056036b2-985f-11e5-8059-e8dab12d3117.png)

We've decided to just jump to the end and created this handy tool enabling us to visualize the dependencies between our issues. For each task we ask "is this dependent on something else?" If the answer is no then we are at leaf node in the graph. Of course we are wrong about that most of the time so when we discover a new dependency we immediately create an issue and add in the dependencies.  So now we have a workable definition of risk - riskier issues have more incoming dependencies.  This vears in to some interesting graph analysis that we haven't gotten in to yet.

To get this operational first create a Github auth token and stick it in the js/config.js file.  There are a few other items in that file you need to modify like the org and the repo's.  Note that you can add multiple repo's in to the repo list; just add comma's.  There are lots of improvements that can make this capability even more cool and we can't wait to see what you do with it :)
