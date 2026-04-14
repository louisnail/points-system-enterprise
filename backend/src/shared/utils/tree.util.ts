export interface TreeNode {
  id: number;
  parentId: number;
  children?: TreeNode[];
  [key: string]: any;
}

export function listToTree<T extends TreeNode>(
  list: T[],
  parentId = 0,
): (T & { children: T[] })[] {
  const map = new Map<number, T & { children: T[] }>();
  const roots: (T & { children: T[] })[] = [];

  for (const item of list) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const item of list) {
    const node = map.get(item.id)!;
    if (item.parentId === parentId) {
      roots.push(node);
    } else {
      const parent = map.get(item.parentId);
      if (parent) {
        parent.children.push(node);
      }
    }
  }

  return roots;
}
