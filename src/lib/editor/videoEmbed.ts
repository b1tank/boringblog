import { Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoEmbed: {
      setVideoEmbed: (options: { src: string; direct?: boolean }) => ReturnType;
    };
  }
}

const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      direct: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-video-embed="true"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const src = String(HTMLAttributes.src || "");
    const direct = Boolean(HTMLAttributes.direct);

    if (direct) {
      return [
        "div",
        {
          "data-video-embed": "true",
          "data-src": src,
          "data-direct": "true",
          style: "position:relative;",
        },
        [
          "video",
          {
            src,
            controls: "true",
            playsinline: "true",
            style: "width:100%;max-height:70vh;",
          },
        ],
      ];
    }

    return [
      "div",
      {
        "data-video-embed": "true",
        "data-src": src,
        style: "position:relative;padding-bottom:56.25%;height:0;overflow:hidden;",
      },
      [
        "iframe",
        {
          src,
          style: "position:absolute;top:0;left:0;width:100%;height:100%;",
          frameborder: "0",
          allow: "autoplay; encrypted-media; picture-in-picture",
          allowfullscreen: "true",
        },
      ],
    ];
  },

  addCommands() {
    return {
      setVideoEmbed:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              direct: Boolean(options.direct),
            },
          });
        },
    };
  },
});

export default VideoEmbed;
