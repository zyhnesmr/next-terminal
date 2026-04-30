import React, { useState, useEffect } from 'react';
import { SftpListDir } from '../../../wailsjs/go/app/App';
import { domain } from '../../../wailsjs/go/models';
import { Folder, FolderOpen, File, ChevronRight, ChevronDown } from 'lucide-react';

type FileEntry = domain.FileEntry;

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  loaded: boolean;
  loading: boolean;
}

interface FileTreeProps {
  explorerId: string;
  onNavigate: (path: string) => void;
}

export function FileTree({ explorerId, onNavigate }: FileTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDirectory('/').then((entries) => {
      const nodes = (entries || [])
        .filter((e) => e.isDir)
        .map((e) => ({ name: e.name, path: e.path, isDir: true, children: [], loaded: false, loading: false }));
      setTree(nodes);
    });
  }, [explorerId]);

  const loadDirectory = async (path: string): Promise<FileEntry[] | null> => {
    try {
      return await SftpListDir(explorerId, path);
    } catch {
      return null;
    }
  };

  const toggleNode = async (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
      setExpandedPaths(newExpanded);
      return;
    }

    newExpanded.add(path);
    setExpandedPaths(newExpanded);

    // Load children if not loaded
    const updateNode = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map((n) => {
        if (n.path === path && !n.loaded) {
          // Mark loading
          loadDirectory(path).then((entries) => {
            const children = (entries || [])
              .filter((e) => e.isDir)
              .map((e) => ({ name: e.name, path: e.path, isDir: true, children: [], loaded: false, loading: false }));
            setTree((prev) => updateTree(prev, path, children));
          });
          return { ...n, loading: true };
        }
        if (n.children.length > 0) {
          return { ...n, children: updateNode(n.children) };
        }
        return n;
      });
    };

    setTree(updateNode(tree));
  };

  const updateTree = (nodes: TreeNode[], targetPath: string, children: TreeNode[]): TreeNode[] => {
    return nodes.map((n) => {
      if (n.path === targetPath) {
        return { ...n, children, loaded: true, loading: false };
      }
      if (n.children.length > 0) {
        return { ...n, children: updateTree(n.children, targetPath, children) };
      }
      return n;
    });
  };

  const renderNode = (node: TreeNode, depth: number) => {
    const isExpanded = expandedPaths.has(node.path);
    return (
      <React.Fragment key={node.path}>
        <div
          className="flex items-center gap-1 py-0.5 text-xs cursor-pointer group"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          onClick={() => toggleNode(node.path)}
          onDoubleClick={() => onNavigate(node.path)}
        >
          {isExpanded ? <ChevronDown size={10} className="shrink-0 opacity-50" /> : <ChevronRight size={10} className="shrink-0 opacity-50" />}
          {isExpanded ? (
            <FolderOpen size={13} style={{ color: 'var(--accent)' }} />
          ) : (
            <Folder size={13} style={{ color: 'var(--accent)' }} />
          )}
          <span className="truncate">{node.name}</span>
        </div>
        {isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="py-1 overflow-y-auto" style={{ color: 'var(--text-primary)' }}>
      <div
        className="flex items-center gap-1 py-0.5 px-2 text-xs cursor-pointer font-medium"
        onClick={() => onNavigate('/')}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <ChevronDown size={10} className="opacity-50" />
        <FolderOpen size={13} style={{ color: 'var(--accent)' }} />
        <span>/</span>
      </div>
      {tree.map((node) => renderNode(node, 1))}
    </div>
  );
}
