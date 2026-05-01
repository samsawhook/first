# Project conventions

## Deployment workflow

After every set of changes that the user accepts (committed and pushed to the
working feature branch), also fast-forward merge the feature branch into `main`
and push `main` to deploy to production. Always do this — the user has
authorized it as a standing instruction.

Procedure:
1. `git push -u origin <feature-branch>` (already covered by existing flow)
2. `git checkout main && git merge --ff-only <feature-branch>`
3. `git push -u origin main`
4. `git checkout <feature-branch>` to return to development branch

If a fast-forward isn't possible, stop and ask the user how to reconcile rather
than force-pushing or doing a non-FF merge.
