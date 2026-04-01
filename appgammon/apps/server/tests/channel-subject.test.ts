import { describe, expect, it, vi } from "vitest";
import { InMemorySubject } from "../src/event-bus/event-bus";

describe("InMemorySubject", () => {
  it("notifies subscribed observers on the matching channel", async () => {
    const subject = new InMemorySubject<string>();
    const observer = { update: vi.fn() };

    subject.attach("session-1", observer);
    subject.notify("session-1", "match_state");
    await Promise.resolve();

    expect(observer.update).toHaveBeenCalledWith("match_state");
  });

  it("keeps channels isolated and supports explicit detach", async () => {
    const subject = new InMemorySubject<number>();
    const observer = { update: vi.fn() };

    subject.attach("session-1", observer);
    subject.notify("session-2", 1);
    subject.detach("session-1", observer);
    subject.notify("session-1", 2);
    await Promise.resolve();

    expect(observer.update).not.toHaveBeenCalled();
  });
});
