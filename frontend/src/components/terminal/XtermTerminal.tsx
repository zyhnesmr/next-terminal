import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { EventsOn, EventsOff, EventsEmit } from '../../../wailsjs/runtime/runtime';

interface XtermTerminalProps {
  sessionId: string;
  theme: Record<string, string>;
  fontSize: number;
  fontFamily: string;
}

export function XtermTerminal({ sessionId, theme, fontSize, fontFamily }: XtermTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      fontSize,
      fontFamily: fontFamily || 'Menlo, Monaco, Courier New, monospace',
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      theme: {
        foreground: theme.foreground,
        background: theme.background,
        cursor: theme.cursor,
        cursorAccent: theme.cursorAccent,
        selectionBackground: theme.selectionBackground,
        black: theme.black,
        red: theme.red,
        green: theme.green,
        yellow: theme.yellow,
        blue: theme.blue,
        magenta: theme.magenta,
        cyan: theme.cyan,
        white: theme.white,
        brightBlack: theme.brightBlack,
        brightRed: theme.brightRed,
        brightGreen: theme.brightGreen,
        brightYellow: theme.brightYellow,
        brightBlue: theme.brightBlue,
        brightMagenta: theme.brightMagenta,
        brightCyan: theme.brightCyan,
        brightWhite: theme.brightWhite,
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(containerRef.current);

    requestAnimationFrame(() => {
      try { fitAddon.fit(); } catch {}
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Listen for output from Go backend
    EventsOn(`terminal:${sessionId}:output`, (data: string) => {
      terminal.write(data);
    });

    // Listen for session closed
    EventsOn(`terminal:${sessionId}:closed`, () => {
      terminal.write('\r\n\x1b[33m[Session closed]\x1b[0m\r\n');
    });

    // Send user input to Go backend
    terminal.onData((data) => {
      EventsEmit('terminal:input', sessionId, data);
    });

    // Handle resize
    terminal.onResize(({ cols, rows }) => {
      EventsEmit('terminal:resize', sessionId, rows, cols);
    });

    // Observe container size changes
    const resizeObserver = new ResizeObserver(() => {
      try { fitAddon.fit(); } catch {}
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      EventsOff(`terminal:${sessionId}:output`);
      EventsOff(`terminal:${sessionId}:closed`);
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId]);

  // Update theme/font when props change
  useEffect(() => {
    if (terminalRef.current) {
      const t = terminalRef.current;
      if (theme) {
        t.options.theme = theme as any;
      }
      if (fontSize) t.options.fontSize = fontSize;
      if (fontFamily) t.options.fontFamily = fontFamily;
    }
  }, [theme, fontSize, fontFamily]);

  return <div ref={containerRef} className="w-full h-full" />;
}
