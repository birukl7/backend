export default function Show({ cv }) {
  return (
    <div>
      <h1>{cv.title}</h1>

      <h3>Experiences</h3>
      {cv.experiences?.map((exp) => (
        <div key={exp.id}>
          <p>{exp.job_title}</p>
        </div>
      ))}

      <h3>Skills</h3>
      {cv.skills?.map((skill) => (
        <div key={skill.id}>
          <p>{skill.skill_name}</p>
        </div>
      ))}
    </div>
  );
}