load("@npm//@angular/bazel:index.bzl", _ng_package = "ng_package")
load(":rollup_globals.bzl", "ROLLUP_GLOBALS")
load(":packages.bzl", "VERSION_PLACEHOLDER_REPLACEMENTS")

def ng_package(name, data = [], deps = [], globals = ROLLUP_GLOBALS, readme_md = None, **kwargs):
    # We need a genrule that copies the license into the current package. This
    # allows us to include the license in the "ng_package".
    native.genrule(
        name = "license_copied",
        srcs = ["//:LICENSE"],
        outs = ["LICENSE"],
        cmd = "cp $< $@",
    )

    _ng_package(
        name = name,
        globals = globals,
        data = data + [":license_copied"],
        # Tslib needs to be explicitly specified as dependency here, so that the `ng_package`
        # rollup bundling action can include tslib. Tslib is usually a transitive dependency of
        # entry-points passed to `ng_package`, but the rule does not collect transitive deps.
        deps = deps + ["@npm//tslib"],
        readme_md = readme_md,
        substitutions = VERSION_PLACEHOLDER_REPLACEMENTS,
        **kwargs
    )
