import assert from 'node:assert/strict'
import { createDemoEnrolment, enrolmentTrend, initialLearners, workspaceCourses } from './demo-workspace'

const now = new Date('2026-11-02T12:00:00Z')
const input = { name: '  Taylor Morgan  ', email: ' TAYLOR@EXAMPLE.COM ', courseId: workspaceCourses[0].id }
const before = initialLearners.length
const result = createDemoEnrolment(input, initialLearners, now)
assert.equal(result.learner.name, 'Taylor Morgan')
assert.equal(result.learner.email, 'taylor@example.com')
assert.equal(result.learner.status, 'active')
assert.equal(result.invoice.amount, workspaceCourses[0].price)
assert.equal(result.invoice.status, 'pending')
assert.equal(result.invoice.studentId, result.learner.id, 'invoice ownership must use the learner ID, not their name')
assert.equal(initialLearners.length, before, 'creating a demo enrolment must not mutate shared fixtures')
assert.throws(() => createDemoEnrolment(input, [...initialLearners, result.learner], now), /already in the demo/)
assert.throws(() => createDemoEnrolment({ ...input, courseId: -1 }, initialLearners, now), /Choose a course/)
assert.throws(() => createDemoEnrolment({ ...input, email: 'invalid' }, initialLearners, now), /valid email/)
assert.throws(() => createDemoEnrolment({ ...input, name: 'a' }, initialLearners, now), /name/)
const trend = enrolmentTrend([result.learner], 6, now)
assert.equal(trend.length, 6)
assert.equal(trend[0].month, 'Jun')
assert.equal(trend[5].month, 'Nov')
assert.equal(trend[5].count, 1)
assert.equal(trend.slice(0, 5).reduce((sum, month) => sum + month.count, 0), 0)
assert.deepEqual(enrolmentTrend([], 3, now).map(item => item.count), [0, 0, 0])
console.log('Demo enrolment validation, invoice creation, fixture isolation and chart periods passed.')
