# dsh-plugin-chat-density

Moves chat message text from the harness default 16px/28px to the design
system's small markdown scale (14px/24px). Headings, code blocks, tables, and
UI chrome keep their own scales.

## Install

```sh
dsh plugin --profile web add /Users/eivgr1/Work.nosync/CODE/dsh-plugin-chat-density
```

(or: file dependency in the profile `package.json` plus the bundle name in
`dsh.profile.bundles`, then restart `dsh web`.)

## Remove

Take `dsh-plugin-chat-density` out of `dsh.profile.bundles` and the
`dependencies` map in the profile `package.json`, remove the symlink in the
profile `node_modules`, and restart.
