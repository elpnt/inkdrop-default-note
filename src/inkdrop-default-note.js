import metadataParser from "markdown-yaml-metadata-parser";
import { Liquid } from "liquidjs";

const DEFAULT_NOTE_TAG = "Default";
const NOTE_STATUSES = ["none", "active", "onHold", "completed", "dropped"];

const getDefaultNoteTemplate = async () => {
  const { notes, tags } = inkdrop.store.getState();
  try {
    const defaultTag = tags.all.find(({ name }) => name === DEFAULT_NOTE_TAG);
    const defaultTagId = defaultTag._id;
    const defaultNote = notes.items.find(({ tags }) =>
      tags.includes(defaultTagId)
    );

    const { metadata, content } = metadataParser(defaultNote.body);
    const engine = new Liquid();
    const now = new Date();
    const title = await engine.parseAndRender(metadata.title, {
      ...metadata,
      now,
    });
    let status = metadata.status;
    if (!NOTE_STATUSES.includes(status)) {
      status = "none";
    }
    const body = await engine.parseAndRender(content.trim(), {
      ...metadata,
      title,
      now,
    });

    return {
      ...defaultNote,
      title,
      status,
      body,
    };
  } catch (err) {
    return err;
  }
};

const createNewNoteFromTemplate = async (template) => {
  const db = inkdrop.main.dataStore.getLocalDB();
  const note = {
    ...template,
    _id: db.notes.createId(),
    _rev: undefined,
    tags: [],
    createdAt: +new Date(),
    updatedAt: +new Date(),
  };
  await db.notes.put(note);
  inkdrop.commands.dispatch(document.body, "core:open-note", {
    noteId: note._id,
  });
  inkdrop.commands.dispatch(document.body, "editor:focus-mde");
};

export const activate = () => {
  inkdrop.commands.add(
    document.body,
    "custom:new-note-from-default",
    async () => {
      getDefaultNoteTemplate()
        .then(async (template) => {
          await createNewNoteFromTemplate(template);
        })
        .catch(() => {
          console.log("Cannot find default note");
          inkdrop.commands.dispatch(document.body, "core:new-note");
        });
    }
  );
};
