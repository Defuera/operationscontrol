- Always use bash commands to create new apps or packages: dart create or flutter create
- Use `very_good_analysis: ^9.0.0`
```yaml
include: package:very_good_analysis/analysis_options.yaml

linter:
  rules:
    one_member_abstracts: false
    public_member_api_docs: false
    sort_pub_dependencies: false
    lines_longer_than_80_chars: false
    avoid_print: false # only for server apps
    avoid_redundant_argument_values: false
    avoid_catching_errors: false
    cascade_invocations: false
```