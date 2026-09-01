# Tiptap Rich Text Editor Setup

The admin course form now uses **Tiptap** for rich text editing in the following fields:
- **Description**
- **Course Details & Curriculum**
- **Curriculum Modules**

## Why Tiptap?

Tiptap is a modern, headless rich text editor built specifically for React/Next.js:
- ✅ **React-first**: Built for React, works seamlessly with Next.js
- ✅ **Stable**: No plugin loading issues or data format errors
- ✅ **Easy to use**: Simple API, excellent documentation
- ✅ **Extensible**: Easy to add custom extensions
- ✅ **HTML output**: Stores content as clean HTML (easy to display)

## Installation

Run the following command in the `edtec-student-management-system` directory:

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
```

## Features

The Tiptap implementation includes:
- **Bold & Italic** - Text formatting
- **Headings** - H1, H2, H3
- **Lists** - Bullet lists and ordered lists
- **Blockquotes** - For quotes
- **Code blocks** - For code snippets
- **Undo/Redo** - Full history support
- **Placeholder** - Shows placeholder text when empty

## Data Format

Tiptap stores data as **HTML strings**. The form automatically:
- Converts HTML strings for storage
- Parses HTML when loading existing course data
- Handles legacy array format for curriculum (converts to HTML lists)

## Usage

1. Click in any of the Tiptap fields to start editing
2. Use the toolbar buttons to format your content
3. The content is automatically saved as HTML
4. When you submit the form, the HTML is stored in the database

## Migration Notes

- Existing courses with plain text descriptions/details will work as-is
- Existing curriculum arrays will be converted to HTML list format on load
- The data is stored as HTML strings in the database (easy to display on frontend)

## Displaying Content

To display the HTML content on the frontend, you can use:

```tsx
<div dangerouslySetInnerHTML={{ __html: course.description }} />
```

Or use a library like `react-html-parser` or `html-react-parser` for safer rendering.

