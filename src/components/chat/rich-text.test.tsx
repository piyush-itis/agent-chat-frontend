import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { extractMarkdownImages, RichText } from "./rich-text";

afterEach(() => {
  cleanup();
});

describe("RichText", () => {
  it("renders markdown images instead of the raw URL", () => {
    render(
      <RichText text={"Here it is:\n\n![Agent Chat App Logo](https://g.tlcdn.com/gen/logo.png)\n"} />,
    );
    expect(screen.queryByText(/!\[Agent Chat App Logo]/)).not.toBeInTheDocument();
    const image = screen.getByRole("img", { name: "Agent Chat App Logo" });
    expect(image).toHaveAttribute("src", "https://g.tlcdn.com/gen/logo.png");
  });

  it("renders bold list items", () => {
    render(<RichText text={"- **Lavender gradient palette** (soft purple)"} />);
    expect(screen.getByText("Lavender gradient palette")).toBeInTheDocument();
    expect(screen.getByText(/soft purple/)).toBeInTheDocument();
  });

  it("extracts markdown image URLs", () => {
    expect(extractMarkdownImages("see ![x](https://cdn.example/a.png)")).toEqual(["https://cdn.example/a.png"]);
  });
});
