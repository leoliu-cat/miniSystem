const svg = `
<svg>
<text transform="translate(116.51 107.39)" font-family="AdobeMingStd-Light-B5pc-H, 'Adobe Ming Std'" font-size="12" font-weight="300"><tspan  >{{groom_name_en}}</tspan></text>
<text transform="translate(116.51 157.54)" font-family="AdobeMingStd-Light-B5pc-H, 'Adobe Ming Std'" font-size="12" font-weight="300"><tspan  >{{groom_name_en}}</tspan></text>
</svg>
`;

function autoCenterSvgVariables(svgContent) {
  return svgContent.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/gi, (match, attributes, innerContent) => {
    let yVal = "";
    const translateMatch = attributes.match(/transform\s*=\s*['"]translate\(\s*[\d.-]+\s*[, ]+\s*([\d.-]+)\s*\)['"]/i);
    if (translateMatch) {
      yVal = translateMatch[1];
      attributes = attributes.replace(/transform\s*=\s*['"]translate\([^)]+\)['"]/i, "");
    }
    attributes = attributes.replace(/\b[xy]\s*=\s*['"][^'"]+['"]/gi, "");
    attributes = attributes.replace(/\btext-anchor\s*=\s*['"][^'"]+['"]/gi, "");
    let newAttributes = attributes;
    if (yVal) {
      newAttributes += ` x="50%" y="${yVal}" text-anchor="middle"`;
    } else {
      newAttributes += ` x="50%" text-anchor="middle"`;
    }
    return `<text${newAttributes}>${innerContent}</text>`;
  });
}

console.log(autoCenterSvgVariables(svg));
