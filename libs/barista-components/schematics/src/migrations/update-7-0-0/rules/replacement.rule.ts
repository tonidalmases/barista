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

import { Rule, Tree, SchematicContext } from '@angular-devkit/schematics';
import { getMatchingFilesFromTree } from '../../../utils';

type Replacer<T> = (fileContent: T) => string;

/** @internal Interface that is used for the list of template Replacements */
export interface ReplacementList<T> {
  /** The needle is the string that should be searched in the template */
  needle: string;
  /** Function to replace the needle in the template or plain string for replacement */
  replacement: Replacer<T> | string;
}

/**
 * @internal
 * Creates the replaceMent rule that loops over the files and replacements
 * a content based on a factory or string inside the file.
 *
 * it the replacement property is a factory function the consumer has to take
 * care about the replacing.
 */
export function replacementRule<T = string>(ruleConfiguration: {
  replacements: ReplacementList<T>[];
  fileType: string;
  /** Preprocessor function that transforms the fileContent */
  filePreprocessor?: (filePath: string) => T | undefined;
}): Rule {
  const { replacements, fileType, filePreprocessor } = ruleConfiguration;
  return async (tree: Tree, context: SchematicContext) => {
    if (replacements.length === 0) {
      context.logger.info(
        'No Replacements specified for the Replacement Rule!',
      );
      return;
    }

    const files = Array.from(
      getMatchingFilesFromTree(tree, (filePath) => filePath.endsWith(fileType)),
    );

    // A for loop with predefined length is the most preforming way to loop over large arrays
    for (let i = 0, max = files.length; i < max; i++) {
      console.log(filePreprocessor);

      let fileContent = filePreprocessor
        ? filePreprocessor(files[i])
        : tree.read(files[i])?.toString();

      if (!fileContent) {
        continue;
      }

      for (let r = 0, rmax = replacements.length; r < rmax; r++) {
        const { replacement, needle } = replacements[r];

        if (typeof fileContent === 'string') {
          // indexOf is the fastest string includes check
          if (fileContent.indexOf(needle) < 0) {
            continue;
          }

          if (typeof replacement === 'string') {
            fileContent = fileContent.replace(
              new RegExp(needle, 'gm'),
              replacement,
            );
            continue;
          }
        }

        fileContent = (replacement as Replacer<T>)(
          (fileContent as unknown) as T,
        ) as string;
      }

      context.logger.info(`Updated File: ${files[i]}`);
      // After all replacements where done overwrite file
      tree.overwrite(files[i], fileContent as string);
    }
  };
}
