import { describe, expect, it, vi } from "vitest";
import { ChannelSubject } from "../src/event-bus/channel-subject";

describe("ChannelSubject", () => {
  it("notifies subscribed observers on the matching channel", async () => {
    const subject = new ChannelSubject<string>();
    const observer = { update: vi.fn() };

    subject.attach("session-1", observer);
    subject.notify("session-1", "match_state");
    await Promise.resolve();

    expect(observer.update).toHaveBeenCalledWith("match_state");
  });

  it("keeps channels isolated and supports unsubscribe", async () => {
    const subject = new ChannelSubject<number>();
    const observer = { update: vi.fn() };

    const unsubscribe = subject.attach("session-1", observer);
    subject.notify("session-2", 1);
    unsubscribe();
    subject.notify("session-1", 2);
    await Promise.resolve();

    expect(observer.update).not.toHaveBeenCalled();
  });
});
