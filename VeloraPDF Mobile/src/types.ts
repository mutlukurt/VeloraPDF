export type PdfFileRecord = {
  id: string;
  name: string;
  uri: string;
  originalUri?: string;
  pageCount?: number;
  lastOpened: number;
};

export type NotebookTemplate = "blank" | "lined" | "grid";
export type NotebookPageOrientation = "portrait" | "landscape";

export type NoteStroke = {
  id: string;
  page: number;
  tool: "pen" | "highlight";
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  opacity?: number;
  createdAt: number;
};

export type VoiceNote = {
  id: string;
  page: number;
  uri: string;
  x: number;
  y: number;
  durationMillis?: number;
  createdAt: number;
};

export type NotebookRecord = {
  id: string;
  title: string;
  template: NotebookTemplate;
  pageOrientations?: Record<string, NotebookPageOrientation>;
  createdAt: number;
  updatedAt: number;
  lastOpened: number;
  pageCount: number;
  strokes: NoteStroke[];
  voiceNotes: VoiceNote[];
};

export type AnnotationTool =
  | "select"
  | "highlight"
  | "pen"
  | "eraser"
  | "rectangle"
  | "circle"
  | "arrow"
  | "text"
  | "sticky";

export type Annotation =
  | {
      id: string;
      page: number;
      type: "highlight";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      opacity: number;
      createdAt: number;
    }
  | {
      id: string;
      page: number;
      type: "pen";
      points: { x: number; y: number }[];
      color: string;
      strokeWidth: number;
      createdAt: number;
    }
  | {
      id: string;
      page: number;
      type: "rectangle" | "circle" | "arrow";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      strokeWidth: number;
      createdAt: number;
    }
  | {
      id: string;
      page: number;
      type: "text";
      x: number;
      y: number;
      text: string;
      color: string;
      fontSize: number;
      createdAt: number;
    }
  | {
      id: string;
      page: number;
      type: "sticky";
      x: number;
      y: number;
      text: string;
      color: string;
      createdAt: number;
    };
