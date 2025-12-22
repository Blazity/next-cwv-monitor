import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within, expect } from "storybook/test";
import { http, HttpResponse, delay } from "msw";
import { LoginForm } from "@/components/login-form";

const meta: Meta<typeof LoginForm> = {
  title: "Components/LoginForm",
  component: LoginForm,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true
    }
  },
  tags: ["autodocs"],
  args: {
    callbackUrl: "/"
  }
};

export default meta;
type Story = StoryObj<typeof LoginForm>;

export const Default: Story = {};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("api/auth/sign-in/email", async () => {
          await delay("infinite");
          return new HttpResponse(null, { status: 200 });
        })
      ]
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText(/email/i), "admin@example.com");
    await userEvent.type(canvas.getByLabelText(/password/i), "password123");

    const submitBtn = canvas.getByRole("button", { name: /sign in/i });
    await userEvent.click(submitBtn);

    await expect(submitBtn).toBeDisabled();
    await expect(canvas.getByText(/signing in/i)).toBeInTheDocument();
  }
};

export const AuthError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("*/api/auth/sign-in/email", () => {
          return new HttpResponse(JSON.stringify({ message: "Invalid email or password" }), { status: 401 });
        })
      ]
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/email/i), "wrong@example.com");
    await userEvent.type(canvas.getByLabelText(/password/i), "wrongpassword");
    await userEvent.click(canvas.getByRole("button", { name: /sign in/i }));
  }
};
