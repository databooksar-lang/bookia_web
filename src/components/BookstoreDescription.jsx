import { parseBookstoreDescription } from "../bookstoreDescriptionFormat";

function InlineDescription({ nodes }) {
  return nodes.map((node, index) => {
    const key = `${node.type}-${index}`;
    if (node.type === "strong") return <strong key={key}><InlineDescription nodes={node.children} /></strong>;
    if (node.type === "emphasis") return <em key={key}><InlineDescription nodes={node.children} /></em>;
    if (node.type === "link") return <a key={key} href={node.href} target="_blank" rel="noopener noreferrer"><InlineDescription nodes={node.children} /></a>;
    if (node.type === "lineBreak") return <br key={key} />;
    return <>{node.value}</>;
  });
}

export function BookstoreDescription({ value, className = "" }) {
  const blocks = parseBookstoreDescription(value);
  return (
    <div className={`bookstore-description ${className}`.trim()}>
      {blocks.map((block, index) => {
        if (block.type === "unorderedList") return <ul key={`list-${index}`}>{block.items.map((item, itemIndex) => <li key={itemIndex}><InlineDescription nodes={item} /></li>)}</ul>;
        if (block.type === "orderedList") return <ol key={`list-${index}`}>{block.items.map((item, itemIndex) => <li key={itemIndex}><InlineDescription nodes={item} /></li>)}</ol>;
        return <p key={`paragraph-${index}`}><InlineDescription nodes={block.children} /></p>;
      })}
    </div>
  );
}
