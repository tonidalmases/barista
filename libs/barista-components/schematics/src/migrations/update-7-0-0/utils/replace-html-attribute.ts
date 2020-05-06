/** Replaces a HTML Attribute on a list of elements returns the replaced content */
export function replaceHtmlAttribute(
  oldAttribute: string,
  newAttribute: string,
  elements: string[],
  content: string,
): string {
  // https://regex101.com/r/EILoLP/1
  const regex = new RegExp(
    `<(${elements.join('|')})[\\s\\S]*?(${oldAttribute})=['"]([\\s\\S]*?)['"]`,
    'gm',
  );
  return content.replace(regex, (match) => {
    return match.replace(oldAttribute, newAttribute);
  });
}
