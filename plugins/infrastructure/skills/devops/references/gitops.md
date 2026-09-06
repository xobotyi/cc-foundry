# Reconciliation Controllers

What Argo CD and Flux reconcile, what they leave alone by design, and what an upgrade changes underneath a working
setup. OpenGitOps v1.0 defines GitOps as declarative desired state, versioned and immutable, pulled automatically, and
continuously reconciled; a CI job that applies on push has the first two properties and neither of the last two.

## Argo CD

- **Sync and Health are separate status fields.** `Synced` means the live state matches the target; `Healthy` means the
  workload runs. Read both. A resource with no health assessment sits in `Progressing`; an Ingress is healthy only when
  `status.loadBalancer.ingress` is non-empty.
- **Automated sync neither prunes nor heals unless told to.** By default automated sync "will not delete resources when
  Argo CD detects the resource is no longer defined in Git" (`prune: true` enables it) and "changes that are made to the
  live cluster will not trigger automated sync" (`selfHeal: true` enables it, retried after a 5 s timeout). Automated
  sync runs only when the application is `OutOfSync`; a `Synced` or errored application never re-syncs on its own, and
  one sync per commit SHA and parameter set.
- **`ignoreDifferences` suppresses the diff; it does not stop the field being applied.** A field excluded by JSON
  pointer, jq path, or `managedFieldsManagers` still gets written on every sync; only sync status and diff ignore it.
  `argocd app diff` with and without the rule shows the gap. Controller-owned fields (HPA replicas, cert-manager
  annotations, external-dns records, operator status) need the rule, or the application flaps between `Synced` and
  `OutOfSync` and a self-heal reverts the controller.
- **Sync waves order by phase, then wave, then kind, then name, and wait for health inside a wave.** Everything is wave
  0 by default. A resource with no health assessment stalls its wave; ordering proves application order, not
  application-level dependency safety.
- **Argo CD 3.0 (2025-05-06) changed defaults under existing installs**: resource tracking moved from labels to
  annotations (`application.resourceTrackingMethod: label` restores it); `logs` RBAC is enforced (`logs, get` needed to
  read pod logs); `update` and `delete` on an application no longer cover its sub-resources; `status` is ignored in
  diffs for every resource, not only CRDs; Endpoints, Leases, and CertificateRequests are excluded from tracking; per-
  resource health is no longer persisted in the Application CR; ConfigMap-based repository configuration is gone; Helm
  3.17.1 makes a null value in `values.yaml` override instead of being ignored; the `argocd_app_sync_status`,
  `argocd_app_health_status`, and `argocd_app_created_time` metrics are removed in favour of labels on
  `argocd_app_info`. Alerts and dashboards built on those metrics go silent after the upgrade.

## Flux

- **`prune` is a required field, and it is what deletes.** With `prune: false` a manifest removed from Git leaves the
  object running. `flux get kustomizations` plus a query for the removed object is the check.
- **`Ready` means applied, and healthy only when `wait: true` or `healthChecks` name the resources.** `wait: true`
  health-checks every reconciled resource and ignores `healthChecks`. `Ready` turns `False` when a rollout fails or
  exceeds the timeout. `dependsOn` waits for the referenced Kustomization's `Ready`, so a dependency without health
  checks releases its dependents while its pods crash-loop. Flux 2.5 (2025-02-20) added CEL custom health checks for
  custom resources with non-standard conditions.
- **Every `interval`, Flux runs a server-side apply dry-run and corrects drift.** A `kubectl` edit is undone at the next
  reconciliation unless made with `--field-manager=flux-client-side-apply`, and a field present in Git is overridden
  regardless of manager. Omit `spec.replicas` from a Deployment that an HPA scales, or Flux and the HPA fight over it.
- **`force: true` replaces a resource when a patch fails on an immutable field**; without it the reconciliation fails
  rather than converging. Suspension stops reconciliation and drift correction together.
- **HelmRelease drift detection is off by default** (`driftDetection.mode: disabled`); `warn` emits events, `enabled`
  patches the cluster back. Ignore rules take JSON pointers or resource selectors, and a per-resource annotation
  `helm.toolkit.fluxcd.io/driftDetection: disabled` exempts one object.
- **A failed commit is not a failed status until the health-check timeout elapses.** An alert wired to `Ready` fires
  late by exactly that timeout; the deliverable records it.

## Both

- **A controller reconciles what it models.** Fields it ignores, resources excluded from prune, suspended objects, data
  inside volumes, listener state inside a pod, and cached DNS outside the cluster are all outside "Synced means done". A
  revert through Git restores declarations, never data: schema migrations, CRD storage versions, persistent volume
  contents, and rotated secrets do not come back with the commit.
- **A `latest` tag makes `Synced` meaningless**: the manifest matches Git while the running image is whatever the node
  cached. Reference images by digest or by an immutable tag that CI writes.
- **Reconciliation interval is API load.** Hundreds of applications polling every minute exhaust the Git host's rate
  limit and load the Kubernetes API server; webhook receivers trigger reconciliation on push instead.
- Argo and Flux are CNCF graduated projects (2022-12-06 and 2022-11-30); graduation says nothing about a configuration's
  safety.
