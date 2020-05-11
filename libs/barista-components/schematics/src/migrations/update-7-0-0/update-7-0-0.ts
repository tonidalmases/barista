/**
 * @license
 * Copyright 2020 Dynatrace LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  chain,
  Rule,
  SchematicContext,
  Tree,
} from '@angular-devkit/schematics';
import { updateDependenciesRule, replacementRule } from './rules';
import {
  installPackagesRule,
  readJsonFromTree,
  getMatchingFilesFromTree,
} from '../../utils';
import { TEMPLATE_REPLACEMENTS } from './config/template-replacements';
import * as ts from 'typescript';

/**
 * @internal
 * Update rule for the version 7.0.0
 */
export default function (): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const tsconfig = readJsonFromTree(tree, 'tsconfig.json');
    console.log(tsconfig);

    const fileNames = Array.from(
      getMatchingFilesFromTree(tree, (filePath) => filePath.endsWith('.ts')),
    );

    const program = ts.createProgram(fileNames, ts.getDefaultCompilerOptions());

    const rule = chain([
      updateDependenciesRule(),
      replacementRule({
        replacements: TEMPLATE_REPLACEMENTS,
        fileType: '.html',
      }),
      replacementRule<ts.SourceFile>({
        replacements: [
          {
            needle: 'DtChartSeries',
            replacement: (content) => {
              console.log('REPLACER: ', content.fileName);
              return '';
            },
          },
        ],
        fileType: '.ts',
        filePreprocessor: (filePath) => {
          const sourceFiles = program.getSourceFiles();
          const file = sourceFiles.find(
            ({ fileName }) => fileName === filePath,
          );

          console.log(file);

          console.log(sourceFiles.map(({ fileName }) => fileName));
          return undefined;
        },
      }),
      installPackagesRule(),
    ]);

    return rule(tree, context);
  };
}
