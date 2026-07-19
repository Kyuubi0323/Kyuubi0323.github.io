#!/usr/bin/env ruby
# frozen_string_literal: true

# Bumps _data/views.yml in response to a repository_dispatch(increment_view)
# event. `current_month_label` is the source of truth for which month
# `current_month` belongs to — comparing against it (rather than guessing
# from the last `history` entry, which is nil until the second month ever
# runs) avoids the nil/empty-history edge case entirely.
#
# Known limitation: this script does one read-modify-write per workflow run
# with no locking. The `concurrency` block in increment-views.yml serializes
# runs so they can't race each other, but if that group is ever removed,
# simultaneous runs could still clobber each other's writes.

require "yaml"

PATH = File.join(__dir__, "..", "..", "_data", "views.yml")

data = YAML.load_file(PATH) || {}
data["history"] ||= []
data["current_month"] = data["current_month"].to_i
this_month = Time.now.utc.strftime("%Y-%m")

if data["current_month_label"].nil? || data["current_month_label"].to_s.empty?
  # First run ever: nothing to archive yet.
  data["current_month_label"] = this_month
  data["current_month"] = 1
elsif data["current_month_label"] == this_month
  data["current_month"] += 1
else
  data["history"] << { "month" => data["current_month_label"], "count" => data["current_month"] }
  data["current_month_label"] = this_month
  data["current_month"] = 1
end

File.write(PATH, data.to_yaml)

puts "views.yml updated: #{data['current_month_label']} => #{data['current_month']} (#{data['history'].size} archived month(s))"
