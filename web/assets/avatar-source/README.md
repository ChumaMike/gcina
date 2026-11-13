# Gcina V2 anatomical source assets

These graphical inputs are from the MakeHuman community repository, pinned to
[`a8bc2d54ff0ac92e78ff71431b1023eda42bf482`](https://github.com/makehumancommunity/makehuman/tree/a8bc2d54ff0ac92e78ff71431b1023eda42bf482).
The mesh, morph target, skeleton and weights are **CC0 1.0**. Their embedded
licence headers/metadata are retained. See [LICENSE.ASSETS.md](LICENSE.ASSETS.md)
and [upstream licensing, section C](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.md).
MakeHuman's executable/source code is not included or imported by the builder.

| Local file | Upstream path |
|---|---|
| `base.obj` | `makehuman/data/3dobjs/base.obj` |
| `african-female-young.target` | `makehuman/data/targets/macrodetails/african-female-young.target` |
| `default.mhskel` | `makehuman/data/rigs/default.mhskel` |
| `default_weights.mhw` | `makehuman/data/rigs/default_weights.mhw` |
| `LICENSE.ASSETS.md` | `LICENSE.ASSETS.md` |

The original Gcina builder (`web/scripts/build-avatar-model.py`) applies the
morph, crops the mesh, shapes the teal garment, creates hair, eyes, teeth, oral
cavity, brow strokes, studs and the Gcina shield, and exports a skinned GLB.
The source assets are retained for reproducibility; they are not served by Next.
Blender is an optional authoring tool, not an application dependency.

Rebuild from the repository root with Blender 4.3.2:

```sh
blender --background --python web/scripts/build-avatar-model.py
```

Output: `web/public/avatars/gcina-v2.glb`. No texture CDN, model service,
Draco decoder, account or runtime licence key is needed. The checked-in GLB is
ready to run without Blender. The asset is a rigged character, not a SASL
animation dataset or a validated sign-language translator.

## Input SHA-256 checksums

```text
8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c  base.obj
92d61eeb3c164b421fd5a7c3537ee45e7e1a51de4d49bf312e19c3df2be1d8fc  african-female-young.target
99f179bce0aa850b45d4191a1d0d234c5851f881c057439470ded3bddf729a24  default.mhskel
0f3641d651ae3d00ad6b4ccee43142edb109d3bd909d27d9e4139ef1beed8625  default_weights.mhw
f6089cba01cb570a24712b41ab8a586ccd3cc5ef53dc266ca50b95c288956d2c  LICENSE.ASSETS.md
```
