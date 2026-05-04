import { Form } from "@inertiajs/react";

export default function CvForm() {
  return (
    <Form action="/cv" method="post">
      <div>
        <label>CV Title</label>
        <input type="text" name="title" />
      </div>

      <button type="submit">Create CV</button>
    </Form>
  );
}